"""
GPU / Hardware Environment Checker
Verifies CUDA, VRAM, and WebGPU readiness for the RLHF pipeline.
"""

import subprocess
import sys

def check_gpu():
    print("╔" + "═" * 52 + "╗")
    print("║" + "  🚀  Hardware Environment Check".center(52) + "║")
    print("╚" + "═" * 52 + "╝\n")

    try:
        import torch
    except ImportError:
        print("❌  PyTorch not installed. Run: pip install torch")
        sys.exit(1)

    cuda = torch.cuda.is_available()
    print(f"{'✅' if cuda else '❌'}  CUDA Available     : {cuda}")

    if cuda:
        dev  = torch.cuda.current_device()
        name = torch.cuda.get_device_name(dev)
        vram = torch.cuda.get_device_properties(dev).total_memory / 1e9
        free = (torch.cuda.get_device_properties(dev).total_memory -
                torch.cuda.memory_allocated(dev)) / 1e9

        print(f"✅  GPU Name          : {name}")
        print(f"🔹  CUDA Version      : {torch.version.cuda}")
        print(f"🔹  Device ID         : {dev}")
        print(f"📊  Total VRAM        : {vram:.2f} GB")
        print(f"📊  Free VRAM         : {free:.2f} GB")

        print("\n── Training Recommendations ──────────────────────────")
        if vram >= 24:
            print("🟢  Full 7B fine-tuning with BF16 — no quantisation needed")
            print("    Recommended: --use_4bit=False, batch_size=4")
        elif vram >= 15:
            print("🟡  QLoRA (4-bit NF4) recommended")
            print("    Recommended: --use_4bit=True, batch_size=2")
        elif vram >= 8:
            print("🟠  QLoRA required — use gradient checkpointing")
            print("    Recommended: --use_4bit=True, batch_size=1, grad_accum=8")
        else:
            print("🔴  < 8 GB VRAM — SFT will be slow/may OOM")
            print("    Use CPU merge only. Reduce max_seq_len to 512.")

        # Quick tensor smoke test
        print("\n── CUDA Tensor Test ────────────────────────────────")
        try:
            a = torch.randn(1024, 1024, device='cuda')
            b = torch.randn(1024, 1024, device='cuda')
            _ = torch.matmul(a, b)
            torch.cuda.synchronize()
            print("✅  1024×1024 matmul on GPU — passed")
        except Exception as e:
            print(f"❌  Tensor test failed: {e}")

    else:
        print("\n⚠️   CPU-only mode:")
        cpu_cores = None
        try:
            import os
            cpu_cores = os.cpu_count()
        except Exception:
            pass
        print(f"    CPU cores: {cpu_cores or 'unknown'}")
        print("    Training will be very slow — use Colab free tier instead.")

    # Flash Attention
    print("\n── Optional Dependencies ───────────────────────────")
    try:
        import flash_attn
        print(f"✅  flash-attn         : {flash_attn.__version__}")
    except ImportError:
        print("🔵  flash-attn         : not installed (optional — speeds training)")
        print("    pip install flash-attn --no-build-isolation")

    try:
        import bitsandbytes as bnb
        print(f"✅  bitsandbytes       : {bnb.__version__}")
    except ImportError:
        print("❌  bitsandbytes       : missing — required for 4-bit QLoRA")
        print("    pip install bitsandbytes")

    try:
        import trl
        print(f"✅  trl                : {trl.__version__}")
    except ImportError:
        print("❌  trl                : missing — required for RLHF pipeline")
        print("    pip install trl")

    print("\n" + "═" * 54)
    print("  WebGPU: check web_app.html in a Chrome/Edge browser")
    print("═" * 54 + "\n")


if __name__ == "__main__":
    check_gpu()