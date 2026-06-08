"""
╔══════════════════════════════════════════════════════════════════════════════╗
║         GEMINI-STYLE RLHF TRAINING PIPELINE — WebGPU/CUDA HYBRID           ║
║  Constitutional AI + PPO Reward Modeling + LoRA Fine-Tuning on Qwen2.5     ║
╚══════════════════════════════════════════════════════════════════════════════╝

Architecture mirrors Google DeepMind's RLHF approach:
  1. Supervised Fine-Tuning (SFT)  — warm-start from human demonstrations
  2. Reward Model Training         — learn human preferences from chosen/rejected pairs
  3. PPO Reinforcement Learning    — optimize policy against reward signal
  4. Constitutional AI filter      — self-critique loop for safety/quality
"""

import os
import sys
import json
import torch
import logging
from dataclasses import dataclass, field
from typing import Optional, List
from pathlib import Path

# ─── Dependency guard ────────────────────────────────────────────────────────
REQUIRED = ["transformers", "peft", "trl", "datasets", "accelerate", "bitsandbytes"]
missing = []
for pkg in REQUIRED:
    try:
        __import__(pkg)
    except ImportError:
        missing.append(pkg)
if missing:
    print(f"❌  Missing packages: {', '.join(missing)}")
    print(f"    Run:  pip install {' '.join(missing)}")
    sys.exit(1)

from transformers import (
    AutoModelForCausalLM,
    AutoModelForSequenceClassification,
    AutoTokenizer,
    TrainingArguments,
    BitsAndBytesConfig,
)
from peft import LoraConfig, TaskType, get_peft_model, prepare_model_for_kbit_training
from trl import (
    SFTTrainer,
    RewardTrainer,
    PPOTrainer,
    PPOConfig,
    AutoModelForCausalLMWithValueHead,
    RewardConfig,
)
from datasets import Dataset, load_dataset
import numpy as np

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
    level=logging.INFO,
)
log = logging.getLogger("RLHF")


# ─── Configuration ───────────────────────────────────────────────────────────
@dataclass
class RLHFConfig:
    # Model
    base_model: str             = "Qwen/Qwen2.5-Coder-7B-Instruct"
    dataset_path: str           = "my_rlhf_dataset.json"
    output_dir: str             = "./trained_rlhf_model"
    reward_model_dir: str       = "./reward_model"

    # Hardware — auto-detect WebGPU/CUDA/CPU
    use_4bit: bool              = True      # QLoRA — fits in 15 GB VRAM
    use_flash_attention: bool   = False     # Set True if flash-attn installed

    # LoRA — matches Gemini's PEFT approach
    lora_r: int                 = 16
    lora_alpha: int             = 32
    lora_dropout: float         = 0.05
    lora_target_modules: List[str] = field(
        default_factory=lambda: ["q_proj", "k_proj", "v_proj", "o_proj",
                                  "gate_proj", "up_proj", "down_proj"]
    )

    # SFT stage
    sft_epochs: int             = 2
    sft_batch_size: int         = 2
    sft_lr: float               = 2e-4
    sft_max_seq_len: int        = 1024
    sft_grad_accum: int         = 4

    # Reward model stage
    reward_epochs: int          = 3
    reward_batch_size: int      = 4
    reward_lr: float            = 1e-5

    # PPO stage — Gemini uses large batches; scale down for Colab
    ppo_epochs: int             = 1
    ppo_batch_size: int         = 16
    ppo_mini_batch: int         = 4
    ppo_lr: float               = 1.4e-5
    ppo_steps: int              = 100
    kl_penalty: str             = "kl"          # or "abs", "mse", "full"
    init_kl_coef: float         = 0.2
    target_kl: float            = 6.0
    cliprange: float            = 0.2
    cliprange_value: float      = 0.2
    vf_coef: float              = 0.1
    gamma: float                = 1.0
    lam: float                  = 0.95

    # Constitutional AI self-critique
    use_constitutional_ai: bool = True
    constitution_principles: List[str] = field(default_factory=lambda: [
        "The response must be helpful, harmless, and honest.",
        "Prefer concise, clean code over verbose implementations.",
        "Explanations should be clear and well-structured.",
        "Avoid unnecessary disclaimers or repetition.",
        "Always produce production-ready, runnable code.",
    ])


CFG = RLHFConfig()


# ─── Device detection (CUDA / CPU; WebGPU handled at app layer) ───────────────
def detect_device() -> str:
    if torch.cuda.is_available():
        name = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_memory / 1e9
        log.info(f"🟢  GPU: {name}  |  VRAM: {vram:.1f} GB")
        if vram < 8:
            log.warning("⚠️  < 8 GB VRAM — disabling 4-bit and reducing batch sizes")
            CFG.use_4bit = False
            CFG.sft_batch_size = 1
            CFG.ppo_batch_size = 8
        return "cuda"
    log.warning("🟡  No GPU detected — running on CPU (slow)")
    return "cpu"


DEVICE = detect_device()


# ─── Quantization config ──────────────────────────────────────────────────────
def get_bnb_config() -> Optional[BitsAndBytesConfig]:
    if not CFG.use_4bit or DEVICE == "cpu":
        return None
    return BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )


# ─── LoRA config ─────────────────────────────────────────────────────────────
def get_lora_config(task: TaskType = TaskType.CAUSAL_LM) -> LoraConfig:
    return LoraConfig(
        r=CFG.lora_r,
        lora_alpha=CFG.lora_alpha,
        lora_dropout=CFG.lora_dropout,
        target_modules=CFG.lora_target_modules,
        bias="none",
        task_type=task,
    )


# ─── Dataset loader ───────────────────────────────────────────────────────────
def load_rlhf_dataset() -> Dataset:
    path = Path(CFG.dataset_path)
    if not path.exists():
        log.error(f"Dataset not found: {path}")
        sys.exit(1)

    with open(path) as f:
        raw = json.load(f)

    log.info(f"📂  Loaded {len(raw)} preference pairs from {path}")

    # Validate schema
    required_keys = {"prompt", "chosen", "rejected"}
    for i, item in enumerate(raw):
        if not required_keys.issubset(item.keys()):
            log.error(f"Row {i} missing keys. Expected: {required_keys}")
            sys.exit(1)

    return Dataset.from_list(raw)


# ─── Tokenizer ────────────────────────────────────────────────────────────────
def load_tokenizer(model_name: str) -> AutoTokenizer:
    tok = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
        tok.pad_token_id = tok.eos_token_id
    tok.padding_side = "left"   # Required for decoder-only PPO
    return tok


# ═══════════════════════════════════════════════════════════════════════════════
#  STAGE 1 — SUPERVISED FINE-TUNING (SFT)
#  Mirrors Gemini SFT warm-start on high-quality human demonstrations
# ═══════════════════════════════════════════════════════════════════════════════
def run_sft(dataset: Dataset, tokenizer: AutoTokenizer) -> str:
    log.info("\n" + "═" * 70)
    log.info("  STAGE 1/3 — SUPERVISED FINE-TUNING (SFT)")
    log.info("═" * 70)

    sft_dir = CFG.output_dir + "_sft"
    bnb_cfg = get_bnb_config()

    model = AutoModelForCausalLM.from_pretrained(
        CFG.base_model,
        quantization_config=bnb_cfg,
        device_map="auto" if DEVICE == "cuda" else "cpu",
        torch_dtype=torch.bfloat16 if DEVICE == "cuda" else torch.float32,
        trust_remote_code=True,
        low_cpu_mem_usage=True,
        attn_implementation="flash_attention_2" if CFG.use_flash_attention else "eager",
    )

    if CFG.use_4bit:
        model = prepare_model_for_kbit_training(model)

    lora_cfg = get_lora_config(TaskType.CAUSAL_LM)
    model = get_peft_model(model, lora_cfg)
    model.print_trainable_parameters()

    # Format as chat turns for SFT
    def format_chat(example):
        return {
            "text": (
                f"<|im_start|>user\n{example['prompt']}<|im_end|>\n"
                f"<|im_start|>assistant\n{example['chosen']}<|im_end|>"
            )
        }

    sft_data = dataset.map(format_chat)

    training_args = TrainingArguments(
        output_dir=sft_dir,
        num_train_epochs=CFG.sft_epochs,
        per_device_train_batch_size=CFG.sft_batch_size,
        gradient_accumulation_steps=CFG.sft_grad_accum,
        learning_rate=CFG.sft_lr,
        fp16=DEVICE == "cuda" and not CFG.use_4bit,
        bf16=DEVICE == "cuda" and CFG.use_4bit,
        logging_steps=10,
        save_strategy="epoch",
        warmup_ratio=0.05,
        lr_scheduler_type="cosine",
        report_to="none",
        optim="paged_adamw_8bit" if CFG.use_4bit else "adamw_torch",
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
    )

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=sft_data,
        tokenizer=tokenizer,
        dataset_text_field="text",
        max_seq_length=CFG.sft_max_seq_len,
        packing=True,
    )

    trainer.train()
    trainer.save_model(sft_dir)
    tokenizer.save_pretrained(sft_dir)
    log.info(f"✅  SFT complete → {sft_dir}")
    return sft_dir


# ═══════════════════════════════════════════════════════════════════════════════
#  STAGE 2 — REWARD MODEL TRAINING
#  Gemini: scalar reward head trained on human preference pairs (chosen > rejected)
# ═══════════════════════════════════════════════════════════════════════════════
def run_reward_model(dataset: Dataset, tokenizer: AutoTokenizer) -> str:
    log.info("\n" + "═" * 70)
    log.info("  STAGE 2/3 — REWARD MODEL TRAINING")
    log.info("═" * 70)

    bnb_cfg = get_bnb_config()

    reward_model = AutoModelForSequenceClassification.from_pretrained(
        CFG.base_model,
        num_labels=1,
        quantization_config=bnb_cfg,
        device_map="auto" if DEVICE == "cuda" else "cpu",
        torch_dtype=torch.bfloat16 if DEVICE == "cuda" else torch.float32,
        trust_remote_code=True,
        low_cpu_mem_usage=True,
    )

    if CFG.use_4bit:
        reward_model = prepare_model_for_kbit_training(reward_model)

    lora_cfg = get_lora_config(TaskType.SEQ_CLS)
    reward_model = get_peft_model(reward_model, lora_cfg)

    # Build paired dataset in TRL RewardTrainer format
    def build_reward_pairs(examples):
        chosen_inputs = tokenizer(
            [f"<|im_start|>user\n{p}<|im_end|>\n<|im_start|>assistant\n{c}<|im_end|>"
             for p, c in zip(examples["prompt"], examples["chosen"])],
            truncation=True, max_length=512, padding="max_length"
        )
        rejected_inputs = tokenizer(
            [f"<|im_start|>user\n{p}<|im_end|>\n<|im_start|>assistant\n{r}<|im_end|>"
             for p, r in zip(examples["prompt"], examples["rejected"])],
            truncation=True, max_length=512, padding="max_length"
        )
        return {
            "input_ids_chosen": chosen_inputs["input_ids"],
            "attention_mask_chosen": chosen_inputs["attention_mask"],
            "input_ids_rejected": rejected_inputs["input_ids"],
            "attention_mask_rejected": rejected_inputs["attention_mask"],
        }

    reward_dataset = dataset.map(build_reward_pairs, batched=True, remove_columns=dataset.column_names)

    reward_args = RewardConfig(
        output_dir=CFG.reward_model_dir,
        num_train_epochs=CFG.reward_epochs,
        per_device_train_batch_size=CFG.reward_batch_size,
        learning_rate=CFG.reward_lr,
        bf16=DEVICE == "cuda",
        logging_steps=5,
        save_strategy="epoch",
        report_to="none",
        gradient_checkpointing=True,
        optim="paged_adamw_8bit" if CFG.use_4bit else "adamw_torch",
        remove_unused_columns=False,
        max_length=512,
    )

    reward_trainer = RewardTrainer(
        model=reward_model,
        args=reward_args,
        tokenizer=tokenizer,
        train_dataset=reward_dataset,
    )

    reward_trainer.train()
    reward_trainer.save_model(CFG.reward_model_dir)
    log.info(f"✅  Reward model trained → {CFG.reward_model_dir}")
    return CFG.reward_model_dir


# ═══════════════════════════════════════════════════════════════════════════════
#  STAGE 3 — PPO REINFORCEMENT LEARNING
#  Policy gradient with KL-divergence penalty (same as Gemini's RLHF stage)
# ═══════════════════════════════════════════════════════════════════════════════
def run_ppo(sft_dir: str, reward_dir: str, dataset: Dataset, tokenizer: AutoTokenizer):
    log.info("\n" + "═" * 70)
    log.info("  STAGE 3/3 — PPO REINFORCEMENT LEARNING")
    log.info("═" * 70)

    ppo_config = PPOConfig(
        model_name=sft_dir,
        learning_rate=CFG.ppo_lr,
        batch_size=CFG.ppo_batch_size,
        mini_batch_size=CFG.ppo_mini_batch,
        gradient_accumulation_steps=CFG.sft_grad_accum,
        ppo_epochs=CFG.ppo_epochs,
        kl_penalty=CFG.kl_penalty,
        init_kl_coef=CFG.init_kl_coef,
        target=CFG.target_kl,
        cliprange=CFG.cliprange,
        cliprange_value=CFG.cliprange_value,
        vf_coef=CFG.vf_coef,
        gamma=CFG.gamma,
        lam=CFG.lam,
        log_with=None,
    )

    bnb_cfg = get_bnb_config()

    # Policy model (the SFT-warmed model with a value head)
    policy_model = AutoModelForCausalLMWithValueHead.from_pretrained(
        sft_dir,
        quantization_config=bnb_cfg,
        device_map="auto" if DEVICE == "cuda" else "cpu",
        torch_dtype=torch.bfloat16 if DEVICE == "cuda" else torch.float32,
        trust_remote_code=True,
    )

    # Reference model (frozen SFT policy — provides KL baseline)
    ref_model = AutoModelForCausalLMWithValueHead.from_pretrained(
        sft_dir,
        quantization_config=bnb_cfg,
        device_map="auto" if DEVICE == "cuda" else "cpu",
        torch_dtype=torch.bfloat16 if DEVICE == "cuda" else torch.float32,
        trust_remote_code=True,
    )

    # Reward scorer
    reward_model = AutoModelForSequenceClassification.from_pretrained(
        reward_dir,
        num_labels=1,
        device_map="auto" if DEVICE == "cuda" else "cpu",
        torch_dtype=torch.bfloat16 if DEVICE == "cuda" else torch.float32,
        trust_remote_code=True,
    )
    reward_model.eval()

    ppo_trainer = PPOTrainer(
        config=ppo_config,
        model=policy_model,
        ref_model=ref_model,
        tokenizer=tokenizer,
    )

    # PPO loop
    prompts = [item["prompt"] for item in dataset]
    log.info(f"🔁  Running {CFG.ppo_steps} PPO steps over {len(prompts)} prompts…")

    for step in range(min(CFG.ppo_steps, len(prompts) // CFG.ppo_batch_size + 1)):
        batch_prompts = prompts[
            step * CFG.ppo_batch_size: (step + 1) * CFG.ppo_batch_size
        ]
        if not batch_prompts:
            break

        # Tokenize queries
        queries = [
            tokenizer.encode(
                f"<|im_start|>user\n{p}<|im_end|>\n<|im_start|>assistant\n",
                return_tensors="pt"
            ).squeeze()
            for p in batch_prompts
        ]

        # Generate responses from policy
        responses = ppo_trainer.generate(
            queries,
            max_new_tokens=256,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            pad_token_id=tokenizer.pad_token_id,
        )

        # Score with reward model
        rewards = []
        for q, r in zip(queries, responses):
            full_text = tokenizer.decode(r, skip_special_tokens=True)
            enc = tokenizer(full_text, return_tensors="pt",
                            truncation=True, max_length=512).to(reward_model.device)
            with torch.no_grad():
                score = reward_model(**enc).logits.squeeze().item()

            # Constitutional AI modifier: apply principle self-critique bonus
            if CFG.use_constitutional_ai:
                score = constitutional_ai_score(full_text, score)

            rewards.append(torch.tensor(score))

        # PPO update step
        stats = ppo_trainer.step(queries, responses, rewards)

        if step % 10 == 0:
            mean_reward = np.mean([r.item() for r in rewards])
            log.info(f"  Step {step:4d} | mean_reward={mean_reward:.4f} "
                     f"| kl={stats.get('objective/kl', 0):.4f}")

    # Save final RLHF model
    ppo_trainer.save_pretrained(CFG.output_dir)
    tokenizer.save_pretrained(CFG.output_dir)
    log.info(f"\n✅  PPO complete → {CFG.output_dir}")


# ═══════════════════════════════════════════════════════════════════════════════
#  CONSTITUTIONAL AI — Self-critique reward modifier
#  Applies principle-based scoring boost/penalty (Gemini uses this at scale)
# ═══════════════════════════════════════════════════════════════════════════════
def constitutional_ai_score(response_text: str, base_score: float) -> float:
    """
    Lightweight Constitutional AI modifier.
    In production (Gemini-scale) this calls a separate critic model.
    Here we use heuristic checks against each constitutional principle.
    """
    score = base_score
    text_lower = response_text.lower()

    # Penalise verbose non-answers
    bad_phrases = [
        "i cannot", "i'm unable", "as an ai", "i don't have the ability",
        "i apologize", "i'm sorry but", "unfortunately i cannot",
    ]
    for phrase in bad_phrases:
        if phrase in text_lower:
            score -= 0.3

    # Reward clean, structured code output
    if "```" in response_text:
        score += 0.2
    if "def " in response_text or "function " in response_text:
        score += 0.1

    # Penalise empty or very short responses
    if len(response_text.strip()) < 20:
        score -= 1.0

    # Penalise hallucinated company names (per system prompt)
    for company in ["openai", "meta", "google", "alibaba", "chatgpt", "gpt-4"]:
        if company in text_lower:
            score -= 0.2

    return float(np.clip(score, -5.0, 5.0))


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN PIPELINE ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════
def main():
    print("\n" + "╔" + "═" * 68 + "╗")
    print("║" + "  GEMINI-STYLE RLHF PIPELINE — Qwen2.5-Coder-7B".center(68) + "║")
    print("╚" + "═" * 68 + "╝\n")

    log.info(f"Config: {CFG}\n")

    dataset  = load_rlhf_dataset()
    tokenizer = load_tokenizer(CFG.base_model)

    # ── Stage 1: SFT ──────────────────────────────────────────────────────────
    sft_dir = run_sft(dataset, tokenizer)

    # ── Stage 2: Reward Model ─────────────────────────────────────────────────
    reward_dir = run_reward_model(dataset, tokenizer)

    # ── Stage 3: PPO ──────────────────────────────────────────────────────────
    run_ppo(sft_dir, reward_dir, dataset, tokenizer)

    print("\n" + "╔" + "═" * 68 + "╗")
    print("║" + "  ✅  RLHF TRAINING COMPLETE".center(68) + "║")
    print(f"║  Adapter saved: {CFG.output_dir}".ljust(69) + "║")
    print("║  Next: run  python merge_lora.py  then  python colab_setup.py".ljust(69) + "║")
    print("╚" + "═" * 68 + "╝\n")


if __name__ == "__main__":
    main()