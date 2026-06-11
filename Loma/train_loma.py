from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/llama-3-8b-bnb-4bit",
    max_seq_length=2048,
    load_in_4bit=True
)

model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj","k_proj","v_proj","o_proj"],
    lora_alpha=16,
    lora_dropout=0,
    bias="none"
)

dataset = load_dataset("json", data_files="loma_lora_dataset.jsonl", split="train")

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="output",
    max_seq_length=2048,
    args=TrainingArguments(
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        num_train_epochs=3,
        learning_rate=2e-4,
        output_dir="loma_lora_output",
        save_steps=100,
        logging_steps=10,
        fp16=True
    )
)

trainer.train()
model.save_pretrained("loma_lora_output")
print("Done. Your LoRA adapter saved to loma_lora_output/")