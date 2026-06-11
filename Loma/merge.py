import os
import glob
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

# Automatically find where the training script saved the adapter configuration
print("Searching for your LoRA adapter directory...")
config_files = glob.glob("./**/adapter_config.json", recursive=True)

if not config_files:
    raise FileNotFoundError(
        "Could not find 'adapter_config.json' anywhere in the current directory or subfolders. "
        "Please check that your training script finished running and saved its weights."
    )

# Select the first matching folder found
lora_weights_path = os.path.dirname(config_files[0])
print(f"Found adapter weights at: {lora_weights_path}")

base_model_path = "gpt2"
output_path = "./gpt2-loma-merged"

print("Merging weights...")
base_model = AutoModelForCausalLM.from_pretrained(base_model_path, dtype=torch.float16)
tokenizer = AutoTokenizer.from_pretrained(base_model_path)

model = PeftModel.from_pretrained(base_model, lora_weights_path)
model = model.merge_and_unload()

print(f"Saving merged model to {output_path}...")
model.save_pretrained(output_path)
tokenizer.save_pretrained(output_path)
print("Done! Weights successfully merged.")
