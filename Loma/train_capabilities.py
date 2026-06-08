"""
╔══════════════════════════════════════════════════════════════════════════════╗
║            CAPABILITIES AUTO-TRAINER — Unsloth Llama 3.2 1B Base             ║
║  Trains the raw base model to use Canvas, Memory, and Image Gen native tags  ║
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
DTYPE = None          # Auto detection. Float16 for V100/T4, Bfloat16 for Ampere+
LOAD_IN_4BIT = True   # Use 4-bit quantization to reduce memory usage

def main():
    print("╔" + "═" * 70 + "╗")
    print("║" + "  🚀  Initializing Unsloth Fast-Trainer (Llama 3.2 1B Base)".center(70) + "║")
    print("╚" + "═" * 70 + "╝\n")

    # 1. Load the UNTRAINED RAW BASE Model (Not Instruct!)
    # This allows us to teach it our exact tool-calling format without fighting 
    # Meta's pre-existing dialogue tuning.
    print("📥 Loading Base Model: unsloth/Llama-3.2-1B...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name = "unsloth/Llama-3.2-1B",
        max_seq_length = MAX_SEQ_LENGTH,
        dtype = DTYPE,
        load_in_4bit = LOAD_IN_4BIT,
    )

    # 2. Add LoRA Adapters (Fine-tuning only ~1-10% of parameters for speed)
    print("⚡ Attaching LoRA Adapters...")
    model = FastLanguageModel.get_peft_model(
        model,
        r = 16, 
        target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                          "gate_proj", "up_proj", "down_proj"],
        lora_alpha = 16,
        lora_dropout = 0,
        bias = "none",
        use_gradient_checkpointing = "unsloth", 
        random_state = 3407,
    )

    # 3. Format the Dataset
    def formatting_prompts_func(examples):
        instructions = examples["instruction"]
        outputs      = examples["chosen"] # We train it to replicate the thumbs-up responses
        texts = []
        
        # Teaching the base model Llama 3's ChatML format from scratch
        for instruction, output in zip(instructions, outputs):
            text = f"<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n{instruction}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n{output}<|eot_id|>"
            texts.append(text)
        return { "text" : texts }

    dataset_path = "my_rlhf_dataset.json"
    if not os.path.exists(dataset_path):
        print(f"❌ Error: '{dataset_path}' not found.")
        print("   Export it from your WebGPU Workspace UI first!")
        return

    print("📂 Loading your exported UI dataset...")
    with open(dataset_path, "r") as f:
        raw_data = json.load(f)

    # Filter out entries where you gave a thumbs down (rejected) and there is no chosen output
    valid_data = [d for d in raw_data if d.get("chosen", "").strip() != ""]
    dataset = Dataset.from_list(valid_data)

    print(f"✅ Found {len(dataset)} valid chosen examples to train on.")
    
    # Map the format
    dataset = dataset.map(formatting_prompts_func, batched = True)

    # 4. Initialize Trainer
    trainer = SFTTrainer(
        model = model,
        tokenizer = tokenizer,
        train_dataset = dataset,
        dataset_text_field = "text",
        max_seq_length = MAX_SEQ_LENGTH,
        dataset_num_proc = 2,
        packing = False, # Can make training 5x faster for short sequences
        args = TrainingArguments(
            per_device_train_batch_size = 2,
            gradient_accumulation_steps = 4,
            warmup_steps = 5,
            max_steps = 60, # Adjust based on dataset size (60 is good for ~20-50 examples)
            learning_rate = 2e-4,
            fp16 = not FastLanguageModel.is_bfloat16_supported(),
            bf16 = FastLanguageModel.is_bfloat16_supported(),
            logging_steps = 5,
            optim = "adamw_8bit",
            weight_decay = 0.01,
            lr_scheduler_type = "linear",
            seed = 3407,
            output_dir = "outputs",
        ),
    )

    # 5. Start Training
    print("\n🔥 Starting Fine-Tuning on Tool Capabilities...")
    trainer_stats = trainer.train()

    # 6. Save the Fine-Tuned Model (LoRA Adapters)
    output_dir = "lora_tool_model"
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"\n✅ Training Complete! Adapters saved to '{output_dir}'.")
    
    print("\nNext Steps:")
    print("1. Merge the adapters into the base model (merge_lora.py)")
    print("2. Compile to WebLLM format (MLC) or export to GGUF for Ollama.")

if __name__ == "__main__":
    main()