#!/usr/bin/env python3
"""
Test Janus-Pro-1B ONNX image generation locally.
Measures: total time, tokens generated, tokens/sec, and step breakdown.
Run from the folder containing onnx/model.onnx + decoder.onnx
"""
import time
import os
import sys
import numpy as np

# Try to import onnxruntime
try:
    import onnxruntime as ort
except ImportError:
    print("Installing onnxruntime...")
    os.system(f"{sys.executable} -m pip install onnxruntime onnx numpy")
    import onnxruntime as ort

MODEL_DIR = "."  # current folder — change if needed
DEVICE = "CUDA"  # or "CPU"

def find_onnx(prefix):
    for f in os.listdir(MODEL_DIR):
        if f.startswith(prefix) and f.endswith(".onnx"):
            return os.path.join(MODEL_DIR, f)
    return None

def main():
    print("=" * 60)
    print("Janus-Pro-1B Image Generation Test")
    print("=" * 60)

    # 1. Find models
    lm_path = find_onnx("lm") or find_onnx("model")
    decoder_path = find_onnx("decoder")
    if not lm_path:
        print(f"No model.onnx found in {os.path.abspath(MODEL_DIR)}")
        print("Download Janus-Pro-1B-ONNX from https://huggingface.co/Xenova/Janus-Pro-1B-ONNX")
        return

    print(f"LM model:    {lm_path}")
    print(f"Decoder:     {decoder_path or 'not found (optional, for full image)'}")
    print(f"Device:      {DEVICE}")
    print()

    # 2. Load ONNX session
    print("Loading ONNX session...")
    t0 = time.time()
    sess_opts = ort.SessionOptions()
    sess_opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    sess_opts.intra_op_num_threads = 4

    providers = ['CUDAExecutionProvider', 'CPUExecutionProvider'] if DEVICE == "CUDA" else ['CPUExecutionProvider']
    sess = ort.InferenceSession(lm_path, sess_opts, providers=providers)
    load_time = time.time() - t0
    print(f"Session loaded in {load_time:.2f}s")
    print(f"IO bindings: {[i.name for i in sess.get_inputs()][:5]}...")
    print()

    # 3. Fake-tokenizer test — simulate 256 autoregressive steps
    # The real processor would tokenize the prompt; here we simulate the
    # autoregressive generation loop to count steps and time per step.
    print("Running autoregressive generation simulation...")
    print("(Using random inputs — real tokenizer needed for actual output)")
    print()

    NUM_TOKENS = 256  # matches browser config: Math.min(576, 256)
    input_names = [i.name for i in sess.get_inputs()]
    output_names = [o.name for o in sess.get_outputs()]

    # Inspect first input shape
    first_in = sess.get_inputs()[0]
    print(f"First input:  name={first_in.name}, shape={first_in.shape}, type={first_in.type}")
    print(f"Outputs:      {output_names[:3]}")
    print()

    # Create dummy inputs (batch=1, seq_len grows)
    batch = 1
    seq_len = 16  # prompt length approximation

    step_times = []
    tokens_generated = 0
    t_start = time.time()

    # Simulate: each step appends one token to the sequence
    for step in range(min(NUM_TOKENS, 16)):  # cap at 16 for quick test
        # Build input dict — shapes must match model expectations
        feed = {}
        for inp in sess.get_inputs():
            # Replace 'batch'/'seq' placeholders with real values
            shape = []
            for d in inp.shape:
                if isinstance(d, int):
                    shape.append(d)
                elif d == 'batch_size' or d == 'batch':
                    shape.append(batch)
                elif d == 'sequence_length' or d == 'seq_len':
                    shape.append(seq_len)
                else:
                    shape.append(1)
            # Random input
            if 'int' in inp.type or 'int64' in str(inp.type):
                feed[inp.name] = np.random.randint(0, 100, size=shape).astype(np.int64)
            else:
                feed[inp.name] = np.random.randn(*shape).astype(np.float32)

        t_step = time.time()
        try:
            outs = sess.run(output_names, feed)
        except Exception as e:
            print(f"  Step {step}: ERROR — {e}")
            break
        step_time = time.time() - t_step
        step_times.append(step_time)
        tokens_generated += 1
        seq_len += 1

        if step < 5 or step % 4 == 0:
            print(f"  Step {step+1:3d}: {step_time:.4f}s  ({1/step_time:.1f} tok/s)")

    total_time = time.time() - t_start

    # 4. Report
    print()
    print("=" * 60)
    print("RESULTS")
    print("=" * 60)
    if step_times:
        avg = np.mean(step_times)
        med = np.median(step_times)
        mx = np.max(step_times)
        mn = np.min(step_times)
        print(f"Steps tested:     {tokens_generated}")
        print(f"Avg time/step:    {avg*1000:.2f} ms")
        print(f"Median time/step: {med*1000:.2f} ms")
        print(f"Min time/step:    {mn*1000:.2f} ms")
        print(f"Max time/step:    {mx*1000:.2f} ms")
        print(f"Throughput:       {1/avg:.1f} tok/s  (avg)")
        print()
        # Extrapolate to 256 tokens
        print(f"Estimated time for {NUM_TOKENS} tokens:")
        print(f"  Avg:  {NUM_TOKENS*avg:.2f}s  ({NUM_TOKENS*avg/60:.1f} min)")
        print(f"  Med:  {NUM_TOKENS*med:.2f}s  ({NUM_TOKENS*med/60:.1f} min)")
        print()
    print(f"Session load time: {load_time:.2f}s")
    print(f"Total test time:   {total_time:.2f}s")

    # 5. Note
    print()
    print("NOTE: This uses random inputs — real tokenizer/processor needed for")
    print("actual image output. But the per-step timing is representative of")
    print("the ONNX kernel execution cost (dominant factor).")
    print()
    print("The Janus model is AUTOREGRESSIVE — each of the 256 tokens must be")
    print("generated one-by-one in sequence. There is no 'steps' knob to turn.")
    print("At ~40ms/step (CPU) or ~10ms/step (GPU) = 256 * step_time total.")

if __name__ == "__main__":
    main()
