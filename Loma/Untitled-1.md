Immediate (no waiting): Drop Modelfile.qwen and Modelfile.llama in your Loma folder and run:
ollama create loma-qwen -f Modelfile.qwen
ollama create loma-llama -f Modelfile.llama
This takes 10 seconds and instantly makes your Ollama models respond as Loma — sharp, direct, no filler, with maths knowledge and coding behavior baked in. Then update your index.html to use loma-qwen instead of qwen2.5:latest.
Then the trainer: Run build_dataset.py first (generates 46 clean rows replacing your garbage 7), then train_loma.py. Runs in ~5 minutes on CPU.
Why your original dataset was killing you: Row 2 was a 3000-character conversation transcript. Row 3 was broken HTML. Row 7 was "answer all quickly" with a nonsense response. The model was learning noise. The new 46 rows are clean instruction→response pairs covering coding, maths, identity, and behavior — exactly what makes a model sharp.