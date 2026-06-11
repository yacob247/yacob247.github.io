"""
train_loma.py  —  Loma LoRA Fine-Tuner
Run: py -3.11 train_loma.py

What this does:
  - Loads GPT-2 (117M params, fully public, no HuggingFace token needed)
  - Applies LoRA adapters (only 0.1% of weights actually train)
  - Trains on loma_lora_dataset.jsonl
  - Saves the adapter to loma_lora_output/
  - Total time on CPU: ~3-8 minutes for 46 rows x 3 epochs

Why GPT-2 and not Llama/Qwen:
  - Llama 3 and Qwen require a HuggingFace token and 4GB+ VRAM for LoRA
  - GPT-2 runs on CPU in minutes and proves the full pipeline works
  - The adapter technique is identical — when you get GPU access, swap model_name
    to "meta-llama/Meta-Llama-3-8B-Instruct" and it works the same way
"""

import os, torch
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling,
)
from peft import LoraConfig, get_peft_model, TaskType
from datasets import load_dataset

# ── CONFIG ────────────────────────────────────────────────────────────────────
MODEL_NAME   = "gpt2"          # No token needed. Swap for larger model when ready.
DATASET_FILE = "loma_lora_dataset.jsonl"
OUTPUT_DIR   = "loma_lora_output"
MAX_LENGTH   = 512
EPOCHS       = 3
BATCH_SIZE   = 1               # CPU mode: keep at 1
LR           = 2e-4

# ── LOAD MODEL + TOKENIZER ────────────────────────────────────────────────────
print("Loading model:", MODEL_NAME)
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
tokenizer.pad_token = tokenizer.eos_token   # GPT-2 has no pad token by default
model = AutoModelForCausalLM.from_pretrained(MODEL_NAME, torch_dtype=torch.float32)

# ── APPLY LORA ────────────────────────────────────────────────────────────────
# r=16 gives more capacity than r=8 — still very fast on CPU at this data size
lora_cfg = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["c_attn"],   # GPT-2's attention projection layer
    bias="none",
)
model = get_peft_model(model, lora_cfg)
model.print_trainable_parameters()

# ── LOAD + TOKENIZE DATASET ───────────────────────────────────────────────────
print("Loading dataset:", DATASET_FILE)
raw = load_dataset("json", data_files=DATASET_FILE, split="train")
print(f"Rows: {len(raw)}")

def format_and_tokenize(example):
    # Format: Alpaca-style instruction template
    if example.get("input", "").strip():
        prompt = (
            f"### Instruction:\n{example['instruction']}\n\n"
            f"### Input:\n{example['input']}\n\n"
            f"### Response:\n{example['output']}"
        )
    else:
        prompt = (
            f"### Instruction:\n{example['instruction']}\n\n"
            f"### Response:\n{example['output']}"
        )
    tokens = tokenizer(
        prompt,
        truncation=True,
        max_length=MAX_LENGTH,
        padding="max_length",
    )
    tokens["labels"] = tokens["input_ids"].copy()
    return tokens

print("Tokenizing...")
tokenized = raw.map(
    format_and_tokenize,
    remove_columns=raw.column_names,
    desc="Tokenizing",
)

# ── TRAINING ARGS ─────────────────────────────────────────────────────────────
args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=4,   # Effective batch = 4 even on CPU
    learning_rate=LR,
    lr_scheduler_type="cosine",
    warmup_ratio=0.1,
    logging_steps=5,
    save_strategy="epoch",
    report_to="none",                # No wandb / tensorboard needed
    no_cuda=True,                    # CPU mode
    fp16=False,                      # CPU doesn't support fp16
    dataloader_num_workers=0,        # Windows safe
    remove_unused_columns=False,
)

# ── TRAINER ───────────────────────────────────────────────────────────────────
trainer = Trainer(
    model=model,
    args=args,
    train_dataset=tokenized,
    data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
)

# ── TRAIN ─────────────────────────────────────────────────────────────────────
print("\nTraining started — this takes ~3-8 minutes on CPU")
print("Watch the loss drop below 1.0 — that means it's learning\n")
trainer.train()

# ── SAVE ──────────────────────────────────────────────────────────────────────
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"\nDone. LoRA adapter saved to {OUTPUT_DIR}/")
print("To load and run inference:")
print("""
    from peft import PeftModel
    from transformers import AutoModelForCausalLM, AutoTokenizer
    base = AutoModelForCausalLM.from_pretrained("gpt2")
    model = PeftModel.from_pretrained(base, "loma_lora_output")
    tokenizer = AutoTokenizer.from_pretrained("loma_lora_output")
""")