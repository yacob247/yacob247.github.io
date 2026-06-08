"""
╔══════════════════════════════════════════════════════════════════════════════╗
║            CAPABILITIES AUTO-TRAINER — Unsloth Llama 3.2 1B Base             ║
║  Trains the model to generate, understand, and search HTML/CSS code          ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import json
import os
from datasets import Dataset
from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments

# ─── Configuration ────────────────────────────────────────────────────────────
MAX_SEQ_LENGTH = 2048
DTYPE          = None    # Auto-detect: Float16 for V100/T4, Bfloat16 for Ampere+
LOAD_IN_4BIT   = True    # 4-bit quantisation — reduces VRAM usage


def main():
    print("╔" + "═" * 70 + "╗")
    print("║" + "  🚀  Initializing Unsloth Fast-Trainer (Llama 3.2 1B Base)".center(70) + "║")
    print("╚" + "═" * 70 + "╝\n")

    # 1. Load the raw base model
    print("📥 Loading Base Model: unsloth/Llama-3.2-1B...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name   = "unsloth/Llama-3.2-1B",
        max_seq_length = MAX_SEQ_LENGTH,
        dtype          = DTYPE,
        load_in_4bit   = LOAD_IN_4BIT,
    )

    # 2. Attach LoRA adapters
    print("⚡ Attaching LoRA Adapters...")
    model = FastLanguageModel.get_peft_model(
        model,
        r                        = 16,
        target_modules           = ["q_proj", "k_proj", "v_proj", "o_proj",
                                    "gate_proj", "up_proj", "down_proj"],
        lora_alpha               = 16,
        lora_dropout             = 0,
        bias                     = "none",
        use_gradient_checkpointing = "unsloth",
        random_state             = 3407,
    )

    # 3. Load and validate dataset
    dataset_path = "my_rlhf_dataset.json"
    if not os.path.exists(dataset_path):
        print(f"❌ Error: '{dataset_path}' not found.")
        print("   Run harvest_data.py first to populate it.")
        return

    print("📂 Loading dataset...")
    with open(dataset_path, "r") as f:
        raw_data = json.load(f)

    # Schema uses "prompt" + "chosen" (matches harvest_data.py and my_rlhf_dataset.json)
    # Filter out any entry missing either field
    valid_data = [
        d for d in raw_data
        if d.get("prompt", "").strip() and d.get("chosen", "").strip()
    ]
    dropped = len(raw_data) - len(valid_data)
    if dropped:
        print(f"⚠️  Dropped {dropped} entries with missing prompt/chosen fields")

    if not valid_data:
        print("❌ No valid training examples found. Exiting.")
        return

    print(f"✅ {len(valid_data)} valid examples to train on.")
    dataset = Dataset.from_list(valid_data)

    # 4. Format into Llama 3 ChatML format
    def formatting_prompts_func(examples):
        prompts  = examples["prompt"]    # ← fixed: was "instruction", now "prompt"
        outputs  = examples["chosen"]
        texts    = []
        for prompt, output in zip(prompts, outputs):
            text = (
                f"<|begin_of_text|>"
                f"<|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|>"
                f"<|start_header_id|>assistant<|end_header_id|>\n\n{output}<|eot_id|>"
            )
            texts.append(text)
        return {"text": texts}

    dataset = dataset.map(formatting_prompts_func, batched=True)

    # 5. Trainer
    # Scale max_steps to dataset size: ~3 steps per example, min 30
    max_steps = max(30, min(len(valid_data) * 3, 200))
    print(f"🔢 Training for {max_steps} steps ({len(valid_data)} examples)")

    trainer = SFTTrainer(
        model              = model,
        tokenizer          = tokenizer,
        train_dataset      = dataset,
        dataset_text_field = "text",
        max_seq_length     = MAX_SEQ_LENGTH,
        dataset_num_proc   = 2,
        packing            = False,
        args = TrainingArguments(
            per_device_train_batch_size  = 2,
            gradient_accumulation_steps  = 4,
            warmup_steps                 = 5,
            max_steps                    = max_steps,
            learning_rate                = 2e-4,
            fp16  = not FastLanguageModel.is_bfloat16_supported(),
            bf16  = FastLanguageModel.is_bfloat16_supported(),
            logging_steps                = 5,
            optim                        = "adamw_8bit",
            weight_decay                 = 0.01,
            lr_scheduler_type            = "linear",
            seed                         = 3407,
            output_dir                   = "outputs",
        ),
    )

    # 6. Train
    print("\n🔥 Starting Fine-Tuning on HTML/CSS Capabilities...")
    trainer.train()

    # 7. Save
    output_dir = "lora_tool_model"
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"\n✅ Training complete. Adapters saved → '{output_dir}'")
    print("\nNext steps:")
    print("  1. python merge_lora.py")
    print("  2. Convert to GGUF and run via Ollama")


if __name__ == "__main__":
    main()