
import os
import sys
import subprocess

# ─── Config — only change these two lines ─────────────────────────────────────

# Your HF username (the one that owns the GGUF repo)
HF_USERNAME = "Yacob-OKour14342"

# The repo + filename where your GGUF is uploaded on HF
HF_GGUF_REPO = "Yacob-OKour14342/trained_rlhf_adapter-Q4_K_M-GGUF"
HF_GGUF_FILE = "trained_rlhf_adapter-q4_k_m.gguf"

# The NEW repo that will be created for the MLC version (browser-ready)
HF_MLC_REPO  = f"{HF_USERNAME}/loma-html-expert-mlc"

# Local paths inside Colab (no Drive needed)
GGUF_LOCAL   = f"/content/{HF_GGUF_FILE}"
MLC_OUTPUT   = "/content/loma-mlc-output"

# Must match your training config
MODEL_TYPE   = "llama"
QUANTISE     = "q4f16_1"
CONTEXT_LEN  = 2048

# ─── Read HF token safely ─────────────────────────────────────────────────────
def get_secret(name):
    try:
        from google.colab import userdata
        val = userdata.get(name)
        if val: return val
    except Exception:
        pass
    val = os.environ.get(name, "")
    if not val:
        print(f"❌  Secret '{name}' not set.")
        print(f"    Click the 🔑 key icon and add '{name}'")
        sys.exit(1)
    return val

HF_TOKEN = get_secret("HF_TOKEN")

print("╔" + "═" * 58 + "╗")
print("║" + "  🦥  Loma MLC Converter — HF → MLC → HF".center(58) + "║")
print("╚" + "═" * 58 + "╝\n")

# ─── Step 1: Install dependencies ─────────────────────────────────────────────
print("⚡  Installing dependencies...")
subprocess.run(["pip", "install", "-q", "huggingface_hub"], check=True)
subprocess.run([
    "pip", "install", "-q", "--pre", "mlc-llm-nightly-cu122",
    "--extra-index-url", "https://mlc.ai/wheels"
], check=True)
print("✅  Dependencies installed\n")

# ─── Step 2: Download GGUF from HF ────────────────────────────────────────────
print(f"📥  Downloading GGUF from Hugging Face...")
print(f"    Repo : {HF_GGUF_REPO}")
print(f"    File : {HF_GGUF_FILE}")

from huggingface_hub import hf_hub_download, HfApi, create_repo

GGUF_LOCAL = hf_hub_download(
    repo_id=HF_GGUF_REPO,
    filename=HF_GGUF_FILE,
    token=HF_TOKEN,
    local_dir="/content",
)

size_gb = os.path.getsize(GGUF_LOCAL) / 1e9
print(f"✅  Downloaded: {GGUF_LOCAL}  ({size_gb:.2f} GB)\n")

# ─── Step 3: Convert GGUF → MLC weights ───────────────────────────────────────
print(f"🔄  Converting GGUF → MLC ({QUANTISE})...")
print("    Takes about 5-10 minutes...\n")

os.makedirs(MLC_OUTPUT, exist_ok=True)

result = subprocess.run([
    "python", "-m", "mlc_llm", "convert_weight",
    GGUF_LOCAL,
    "--quantization", QUANTISE,
    "--model-type", MODEL_TYPE,
    "--output", MLC_OUTPUT,
])

if result.returncode != 0:
    print("❌  Conversion failed. Check the output above for errors.")
    sys.exit(1)

print(f"\n✅  MLC weights saved to: {MLC_OUTPUT}\n")

# ─── Step 4: Generate MLC chat config ─────────────────────────────────────────
print("📝  Generating MLC chat config...")

subprocess.run([
    "python", "-m", "mlc_llm", "gen_config",
    GGUF_LOCAL,
    "--quantization", QUANTISE,
    "--model-type", MODEL_TYPE,
    "--conv-template", "llama-3",
    "--context-window-size", str(CONTEXT_LEN),
    "--output", MLC_OUTPUT,
], check=True)

print("✅  Config generated\n")

# ─── Step 5: Create MLC repo on HF and upload ────────────────────────────────
print(f"📤  Uploading MLC model to: {HF_MLC_REPO}")

api = HfApi(token=HF_TOKEN)

try:
    create_repo(
        HF_MLC_REPO,
        token=HF_TOKEN,
        repo_type="model",
        exist_ok=True,
        private=False,
    )
    print(f"✅  Repo ready: https://huggingface.co/{HF_MLC_REPO}")
except Exception as e:
    print(f"⚠️  Repo note: {e}")

print("    Uploading files (may take a few minutes)...")
api.upload_folder(
    folder_path=MLC_OUTPUT,
    repo_id=HF_MLC_REPO,
    repo_type="model",
    token=HF_TOKEN,
    commit_message="Loma HTML Expert — MLC weights for WebLLM browser inference",
)

print(f"\n✅  Upload complete!")
print(f"    Live at: https://huggingface.co/{HF_MLC_REPO}\n")

# ─── Step 6: Summary ──────────────────────────────────────────────────────────
print("═" * 60)
print("  ✅  DONE — index.html is already configured for this model.")
print(f"  Your MLC repo: https://huggingface.co/{HF_MLC_REPO}")
print("  Push index.html to GitHub — visitors load your model automatically.")
print("═" * 60)