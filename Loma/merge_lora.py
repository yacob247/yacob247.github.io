"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    LoRA WEIGHT MERGER — RLHF → GGUF PIPELINE               ║
║  Merges PEFT adapter into base weights, exports for Ollama / llama.cpp      ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import torch
from pathlib import Path
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

BASE_MODEL_NAME   = "Qwen/Qwen2.5-Coder-7B-Instruct"
ADAPTER_DIR       = "./trained_rlhf_model"
OUTPUT_MERGED_DIR = "./merged_rlhf_model"


def merge_adapter_weights():
    print("╔" + "═" * 60 + "╗")
    print("║" + "  🔄  LoRA Weight Merger Pipeline".center(60) + "║")
    print("╚" + "═" * 60 + "╝\n")

    if not Path(ADAPTER_DIR).exists():
        print(f"❌  Adapter directory not found: '{ADAPTER_DIR}'")
        print("    Run train_rlhf.py first to generate the adapter weights.")
        sys.exit(1)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"⚙️   Merge device: {device.upper()}")

    # ── Load base model on CPU to avoid VRAM spikes ───────────────────────────
    print(f"\n📥  Loading base model: {BASE_MODEL_NAME}")
    print("    (Loading to CPU first — avoids VRAM OOM during merge)")
    try:
        base_model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_NAME,
            torch_dtype=torch.float16,
            device_map="cpu",
            low_cpu_mem_usage=True,
            trust_remote_code=True,
        )
        tokenizer = AutoTokenizer.from_pretrained(
            BASE_MODEL_NAME, trust_remote_code=True
        )
    except Exception as e:
        print(f"❌  Failed to load base model: {e}")
        sys.exit(1)

    # ── Attach PEFT adapter ───────────────────────────────────────────────────
    print(f"\n⚡  Attaching adapter: {ADAPTER_DIR}")
    try:
        model = PeftModel.from_pretrained(
            base_model,
            ADAPTER_DIR,
            device_map="cpu",
            low_cpu_mem_usage=True,
        )
        print("🔗  Baking LoRA weights into base parameters…")
        merged_model = model.merge_and_unload()
    except Exception as e:
        print(f"❌  Merge failed: {e}")
        sys.exit(1)

    # ── Export ────────────────────────────────────────────────────────────────
    print(f"\n💾  Saving merged model → {OUTPUT_MERGED_DIR}")
    try:
        Path(OUTPUT_MERGED_DIR).mkdir(parents=True, exist_ok=True)
        merged_model.save_pretrained(
            OUTPUT_MERGED_DIR,
            safe_serialization=True,
            max_shard_size="4GB",
        )
        tokenizer.save_pretrained(OUTPUT_MERGED_DIR)
    except Exception as e:
        print(f"❌  Export failed: {e}")
        sys.exit(1)

    print("\n" + "╔" + "═" * 60 + "╗")
    print("║" + "  ✅  Merge complete!".center(60) + "║")
    print(f"║  Output: {OUTPUT_MERGED_DIR}".ljust(61) + "║")
    print("╠" + "═" * 60 + "╣")
    print("║  Next steps:".ljust(61) + "║")
    print("║  1. Convert to GGUF:".ljust(61) + "║")
    print("║     python llama.cpp/convert_hf_to_gguf.py \\".ljust(61) + "║")
    print(f"║       {OUTPUT_MERGED_DIR} --outfile model.gguf".ljust(61) + "║")
    print("║  2. Quantise (optional Q4_K_M):".ljust(61) + "║")
    print("║     ./llama.cpp/llama-quantize model.gguf q4_k_m.gguf Q4_K_M".ljust(61) + "║")
    print("║  3. Run colab_setup.py to host via Ollama + ngrok".ljust(61) + "║")
    print("╚" + "═" * 60 + "╝\n")


if __name__ == "__main__":
    merge_adapter_weights()