"""
╔══════════════════════════════════════════════════════════════════════════════╗
║         LOMA HF SPACE SERVER — Real LoRA Training Entrypoint                ║
║  • Starts Ollama on 11434                                                   ║
║  • Exposes HTTP on 7860 for /train, /status, and Ollama proxy               ║
║  • GPU: Unsloth LoRA → GGUF → ollama create loma-lora                      ║
║  • CPU: Modelfile fallback (bakes top examples into system context)         ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import json
import os
import subprocess
import threading
import sys
import time
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler

# ─── Global training state ────────────────────────────────────────────────────
TRAINING_STATUS = {"status": "idle", "model": "llama3.2:1b"}
TRAINING_LOCK   = threading.Lock()


# ═══════════════════════════════════════════════════════════════════════════════
#  OLLAMA STARTUP — called once at boot
# ═══════════════════════════════════════════════════════════════════════════════
def start_ollama():
    env = {**os.environ, "OLLAMA_HOST": "127.0.0.1:11434", "OLLAMA_ORIGINS": "*",
           "OLLAMA_FLASH_ATTENTION": "1", "OLLAMA_NUM_THREAD": "2"}
    subprocess.Popen(["/bin/ollama", "serve"], env=env,
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    print("[Init] Waiting for Ollama on 11434…")
    for _ in range(30):
        try:
            urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=2)
            print("[Init] Ollama ready.")
            return True
        except Exception:
            time.sleep(2)
    print("[Init] WARNING: Ollama did not respond in 60s — continuing anyway.")
    return False


def pull_base_model():
    print("[Init] Pulling llama3.2:1b …")
    try:
        subprocess.run(
            ["ollama", "pull", "llama3.2:1b"],
            env={**os.environ, "OLLAMA_HOST": "127.0.0.1:11434"},
            timeout=600, check=True
        )
        print("[Init] Base model ready.")
    except Exception as e:
        print(f"[Init] Pull failed (may already exist): {e}")


# ═══════════════════════════════════════════════════════════════════════════════
#  TRAINING ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════════════
def run_training(data: list):
    global TRAINING_STATUS
    with TRAINING_LOCK:
        if TRAINING_STATUS.get("status") == "training":
            return
        TRAINING_STATUS = {"status": "training", "started": time.time(), "examples": len(data)}

    # Save dataset
    dataset_path = "/training_data.json"
    with open(dataset_path, "w") as f:
        json.dump(data, f, indent=2)

    # Detect GPU
    has_gpu = False
    try:
        r = subprocess.run(["nvidia-smi"], capture_output=True, timeout=5)
        has_gpu = r.returncode == 0
    except Exception:
        pass

    print(f"[Training] GPU={'yes' if has_gpu else 'no (CPU fallback)'}, examples={len(data)}")

    if has_gpu:
        _train_lora(data, dataset_path)
    else:
        _train_modelfile(data)


# ── REAL LoRA training (GPU path) ─────────────────────────────────────────────
def _train_lora(data: list, dataset_path: str):
    global TRAINING_STATUS
    try:
        TRAINING_STATUS["stage"] = "installing_unsloth"
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-q",
             "unsloth", "trl", "peft", "accelerate", "bitsandbytes", "datasets"],
            check=True, timeout=600
        )

        TRAINING_STATUS["stage"] = "lora_training"
        lora_script = r"""
import json, torch, sys
from datasets import Dataset
from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments

with open("/training_data.json") as f:
    raw = json.load(f)

rows = []
for entry in raw:
    if not entry.get("prompt") or not entry.get("chosen"):
        continue
    rows.append({"text": f"<|user|>\n{entry['prompt']}\n<|assistant|>\n{entry['chosen']}"})

if len(rows) < 3:
    print("[LoRA] Not enough valid rows."); sys.exit(1)

dataset = Dataset.from_list(rows)

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Llama-3.2-1B-Instruct",
    max_seq_length=2048, dtype=None, load_in_4bit=True,
)
model = FastLanguageModel.get_peft_model(
    model, r=16,
    target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"],
    lora_alpha=16, lora_dropout=0, bias="none",
    use_gradient_checkpointing=True, random_state=42,
)
trainer = SFTTrainer(
    model=model, tokenizer=tokenizer, train_dataset=dataset,
    dataset_text_field="text", max_seq_length=2048,
    args=TrainingArguments(
        output_dir="/lora_output",
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        num_train_epochs=2,
        learning_rate=2e-4,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=5, save_strategy="no", report_to="none",
    ),
)
print(f"[LoRA] Training on {len(rows)} examples…")
trainer.train()
model.save_pretrained("/lora_output")
tokenizer.save_pretrained("/lora_output")
print("[LoRA] Converting to GGUF…")
model.save_pretrained_gguf("/lora_gguf", tokenizer, quantization_method="q4_k_m")
print("[LoRA] Done.")
"""
        with open("/lora_train.py", "w") as f:
            f.write(lora_script)

        result = subprocess.run(
            [sys.executable, "/lora_train.py"],
            capture_output=True, text=True, timeout=3600
        )
        if result.returncode != 0:
            raise RuntimeError(f"LoRA script failed:\n{result.stderr[-800:]}")

        # Find GGUF
        gguf_path = None
        for fname in os.listdir("/lora_gguf"):
            if fname.endswith(".gguf"):
                gguf_path = f"/lora_gguf/{fname}"
                break
        if not gguf_path:
            raise FileNotFoundError("GGUF not found after training.")

        TRAINING_STATUS["stage"] = "loading_into_ollama"
        with open("/Modelfile", "w") as f:
            f.write(f"FROM {gguf_path}\n")
            f.write('SYSTEM "You are Loma — custom-trained AI by Yacob\'s Digital."\n')
            f.write("PARAMETER temperature 0.7\nPARAMETER num_ctx 4096\n")

        create = subprocess.run(
            ["ollama", "create", "loma-lora", "-f", "/Modelfile"],
            capture_output=True, text=True, timeout=300,
            env={**os.environ, "OLLAMA_HOST": "127.0.0.1:11434"}
        )
        if create.returncode != 0:
            raise RuntimeError(f"ollama create failed: {create.stderr[:400]}")

        TRAINING_STATUS = {
            "status": "done", "model": "loma-lora",
            "method": "lora_gguf", "examples": len(data),
            "finished": time.time()
        }
        print("[Training] ✅ LoRA complete → loma-lora")

    except Exception as e:
        print(f"[Training] LoRA failed, falling back: {e}")
        _train_modelfile(data)


# ── Modelfile fallback (CPU path) ─────────────────────────────────────────────
def _train_modelfile(data: list):
    global TRAINING_STATUS
    try:
        TRAINING_STATUS["stage"] = "modelfile_fallback"
        top = sorted(data, key=lambda x: float(x.get("score", 0.8)), reverse=True)[:30]

        lines = [
            'FROM llama3.2:1b\n',
            'SYSTEM "You are Loma, built by Yacob\'s Digital (https://envizion.work). '
            'Always produce complete, production-ready code in single files."\n',
        ]
        for entry in top:
            p = entry.get("prompt", "").replace('"', '\\"').replace('\n', '\\n')[:300]
            c = entry.get("chosen",  "").replace('"', '\\"').replace('\n', '\\n')[:800]
            if p and c:
                lines.append(f'MESSAGE user "{p}"\n')
                lines.append(f'MESSAGE assistant "{c}"\n')
        lines.append("PARAMETER temperature 0.7\nPARAMETER num_ctx 4096\n")

        with open("/Modelfile", "w") as f:
            f.writelines(lines)

        result = subprocess.run(
            ["ollama", "create", "loma-trained", "-f", "/Modelfile"],
            capture_output=True, text=True, timeout=300,
            env={**os.environ, "OLLAMA_HOST": "127.0.0.1:11434"}
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr[:400])

        TRAINING_STATUS = {
            "status": "done", "model": "loma-trained",
            "method": "modelfile_fallback", "examples": len(top),
            "finished": time.time()
        }
        print(f"[Training] ✅ Modelfile fallback → loma-trained ({len(top)} examples)")

    except Exception as e:
        TRAINING_STATUS = {"status": "error", "error": str(e)[:500]}
        print(f"[Training] ❌ {e}")


# ═══════════════════════════════════════════════════════════════════════════════
#  HTTP SERVER — port 7860
# ═══════════════════════════════════════════════════════════════════════════════
class Handler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass  # suppress noise

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _json(self, code: int, payload: dict):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/status":
            self._json(200, TRAINING_STATUS)
            return
        if self.path == "/health":
            self._json(200, {"ok": True, "model": TRAINING_STATUS.get("model")})
            return
        self._proxy("GET", b"")

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body   = self.rfile.read(length)

        # ── /train endpoint ───────────────────────────────────────────────────
        if self.path == "/train":
            if TRAINING_STATUS.get("status") == "training":
                self._json(409, {"error": "training_already_running"})
                return
            try:
                payload = json.loads(body)
                data    = payload.get("training_data", [])
                if len(data) < 5:
                    self._json(400, {"error": "need_at_least_5_examples", "got": len(data)})
                    return
                t = threading.Thread(target=run_training, args=(data,), daemon=True)
                t.start()
                self._json(202, {"status": "training_started", "examples": len(data)})
            except Exception as e:
                self._json(500, {"error": str(e)})
            return

        # ── Proxy everything else to Ollama ───────────────────────────────────
        self._proxy("POST", body)

    def _proxy(self, method: str, body: bytes):
        """Forward request to local Ollama."""
        try:
            ct  = self.headers.get("Content-Type", "application/json")
            req = urllib.request.Request(
                f"http://127.0.0.1:11434{self.path}",
                data=body if method == "POST" and body else None,
                headers={"Content-Type": ct},
                method=method,
            )
            with urllib.request.urlopen(req, timeout=120) as r:
                resp_body = r.read()
                resp_ct   = r.headers.get("Content-Type", "application/json")

            self.send_response(200)
            self.send_header("Content-Type", resp_ct)
            self._cors()
            # Stream-friendly: no Content-Length so client can stream
            self.end_headers()
            self.wfile.write(resp_body)

        except Exception as e:
            self._json(502, {"error": f"Ollama proxy error: {e}"})


# ═══════════════════════════════════════════════════════════════════════════════
#  ENTRYPOINT
# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    start_ollama()
    pull_base_model()

    port = int(os.environ.get("PORT", 7860))
    print(f"[Loma Server] Listening on 0.0.0.0:{port}")
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()