LOMA PHASE 3 — EXACT STEPS
==========================

STEP 1 — Generate the real dataset (run once)
----------------------------------------------
Copy build_dataset.py into your Loma folder, then:

    py -3.11 build_dataset.py

Output: loma_lora_dataset.jsonl with 46 high-quality rows
(replaces the garbage 7-row version)


STEP 2 — Run the LoRA trainer
-------------------------------
Copy train_loma.py into your Loma folder, then:

    py -3.11 train_loma.py

Expected output:
    trainable params: ~300,000 (0.23% of total)
    Epoch 1/3: loss drops from ~3.5 → ~1.5
    Epoch 2/3: loss ~1.2
    Epoch 3/3: loss ~0.9
    Saved to loma_lora_output/

Time: 3-8 minutes on CPU. Do not close the terminal.
If loss stays above 2.0 after epoch 1, something is wrong — paste the error.


STEP 3 — Bake Loma identity into Ollama models (do this NOW, instant)
-----------------------------------------------------------------------
Copy Modelfile.qwen and Modelfile.llama into your Loma folder, then:

    ollama create loma-qwen -f Modelfile.qwen
    ollama create loma-llama -f Modelfile.llama

Test immediately:
    ollama run loma-qwen
    ollama run loma-llama

These now respond as Loma — no filler, direct, sharp, with the full
identity, behavior rules, and maths knowledge baked in at model level.


STEP 4 — Update index.html to use the new model names
------------------------------------------------------
In your Loma index.html, wherever you set the model for Ollama calls,
change:
    "qwen2.5:latest"  →  "loma-qwen"
    "llama3:latest"   →  "loma-llama"

That's it. Every response is now Loma-native.


PHASE 3 NEXT LEVEL (when you have 500+ rows)
============================================
When you have enough real conversation data:

1. Export from Loma:
       window.exportLoRADataset()   (add this to index.html)

2. Re-run build_dataset.py merged with your exported data

3. Re-run train_loma.py — same command, better model

4. For GPU training (10x faster, supports Qwen/Llama directly):
   Upload dataset to Google Colab, run the same train_loma.py
   with no_cuda=False and model_name = "Qwen/Qwen2.5-7B-Instruct"


WHY THIS WORKS
==============
- Modelfile: changes behavior, personality, output style immediately
- LoRA: fine-tunes actual weights — the model learns your patterns
- Quality data beats quantity: 46 clean rows > 7 garbage rows
- The two methods stack: Modelfile sets the persona, LoRA sharpens the knowledge
