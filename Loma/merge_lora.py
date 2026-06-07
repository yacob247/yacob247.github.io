import os
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

# Target configuration matching standard Colab memory limits
BASE_MODEL_NAME = "Qwen/Qwen2.5-Coder-7B-Instruct"
ADAPTER_DIR = "./trained_rlhf_model"
OUTPUT_MERGED_DIR = "./merged_rlhf_model"

def merge_adapter_weights():
    print("====================================================")
    print("🔄 Starting Headless LoRA Weight Merger Pipeline")
    print("====================================================\n")

    if not os.path.exists(ADAPTER_DIR):
        print(f"❌ ERROR: Adapter directory '{ADAPTER_DIR}' not found.")
        print("Please ensure your RLHF training script ran successfully and saved its output.")
        return

    # Determine execution platform device parameters
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🤖 Processing merge calculations on: {device.upper()}")

    print(f"📥 Loading base model weights: {BASE_MODEL_NAME}...")
    torch_dtype = torch.float16 # Uses 16-bit to prevent memory footprint crashes on free tier Colab GPUs
    
    try:
        base_model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_NAME,
            torch_dtype=torch_dtype,
            device_map="cpu", # Keeps initial load on RAM to prevent GPU VRAM OOM error spikes
            low_cpu_mem_usage=True
        )
        tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME)
    except Exception as e:
        print(f"❌ Failed to load base model structure: {e}")
        return

    print(f"⚡ Merging adapters found in: {ADAPTER_DIR}...")
    try:
        # Wrap the preloaded base model inside adapter structures
        model = PeftModel.from_pretrained(
            base_model,
            ADAPTER_DIR,
            device_map="cpu",
            low_cpu_mem_usage=True
        )
        
        print("🔗 Baking PEFT layer parameters directly into base network...")
        merged_model = model.merge_and_unload()
        
    except Exception as e:
        print(f"❌ Failed to construct PEFT merge mapping: {e}")
        return

    print(f"💾 Exporting unified serializations folder: {OUTPUT_MERGED_DIR}...")
    try:
        os.makedirs(OUTPUT_MERGED_DIR, exist_ok=True)
        merged_model.save_pretrained(OUTPUT_MERGED_DIR, safe_serialization=True)
        tokenizer.save_pretrained(OUTPUT_MERGED_DIR)
        
        print("\n====================================================")
        print("✅ SUCCESS: Weights merged cleanly!")
        print(f"Model saved in: {OUTPUT_MERGED_DIR}")
        print("====================================================\n")
        print("🚀 Next steps to import into Ollama:")
        print("1. Convert output folder to GGUF format using llama.cpp scripts.")
        
    except Exception as e:
        print(f"❌ Failed to output merged folder files: {e}")

if __name__ == "__main__":
    merge_adapter_weights()