import os
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

# These paths match your training output directory
BASE_MODEL_NAME = "Qwen/Qwen2.5-Coder-7B-Instruct"
ADAPTER_DIR = "./trained_rlhf_model"
OUTPUT_MERGED_DIR = "./merged_rlhf_model"

def merge_adapter_weights():
    print("====================================================")
    print("🔄 Starting LoRA Weight Merger Pipeline")
    print("====================================================\n")

    if not os.path.exists(ADAPTER_DIR):
        print(f"❌ ERROR: Adapter directory '{ADAPTER_DIR}' not found.")
        print("Please ensure your RLHF training script ran successfully and saved its output.")
        return

    # Determine optimal precision device configuration
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🤖 Processing on device: {device.upper()}")

    print(f"📥 Loading base model: {BASE_MODEL_NAME}...")
    # We load the base model in float16/bfloat16 precision instead of 4-bit to prevent accuracy loss during merge
    torch_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    
    try:
        base_model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_NAME,
            torch_dtype=torch_dtype,
            device_map="cpu", # Load on CPU memory to avoid running out of GPU VRAM while loading both models
            low_cpu_mem_usage=True
        )
        tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME)
    except Exception as e:
        print(f"❌ Failed to load base model: {e}")
        return

    print(f"⚡ Loading trained RLHF adapter from: {ADAPTER_DIR}...")
    try:
        # Wrap our base model with the saved adapter layer
        model = PeftModel.from_pretrained(
            base_model,
            ADAPTER_DIR,
            device_map="cpu",
            low_cpu_mem_usage=True
        )
        
        print("🔗 Merging adapter weights into the base neural network... (This may take a moment)")
        # This physically bakes the adapter weights into the base model structure
        merged_model = model.merge_and_unload()
        
    except Exception as e:
        print(f"❌ Failed during merging process: {e}")
        return

    print(f"💾 Saving unified Hugging Face model folder to: {OUTPUT_MERGED_DIR}...")
    try:
        os.makedirs(OUTPUT_MERGED_DIR, exist_ok=True)
        merged_model.save_pretrained(OUTPUT_MERGED_DIR, safe_serialization=True)
        tokenizer.save_pretrained(OUTPUT_MERGED_DIR)
        
        print("\n====================================================")
        print("✅ SUCCESS: Model Weights Merged Cleanly!")
        print(f"Your unified model is saved in: {OUTPUT_MERGED_DIR}")
        print("====================================================")
        print("\n🚀 Next Steps to Convert to Ollama GGUF format:")
        print("1. Download the conversion tool:")
        print("   git clone https://github.com/ggerganov/llama.cpp")
        print("   pip install -r llama.cpp/requirements.txt")
        print("2. Run the conversion script:")
        print(f"   python llama.cpp/convert_hf_to_gguf.py {OUTPUT_MERGED_DIR} --outfile rlhf_model.gguf")
        print("3. Import rlhf_model.gguf into Ollama via your Modelfile.")
        
    except Exception as e:
        print(f"❌ Failed to save merged weights: {e}")

if __name__ == "__main__":
    merge_adapter_weights()
