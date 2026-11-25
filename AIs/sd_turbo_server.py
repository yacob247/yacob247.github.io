#!/usr/bin/env python3
"""
SD-Turbo Local Inference Server
Loads SD-Turbo from local ONNX weights and serves image generation via HTTP.
"""

import os
import json
import base64
import io
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException, Form
from fastapi.responses import Response, JSONResponse
import uvicorn

import onnxruntime as ort

MODEL_DIR = Path(r"C:\Users\youse\Downloads\AIs\sd-turbo\sd-turbo-r2")
MODEL_DIR = MODEL_DIR.resolve()

print(f"[SD-Turbo] Loading model from: {MODEL_DIR}")

unet_path = MODEL_DIR / "unet" / "onnx" / "model.onnx"
text_encoder_path = MODEL_DIR / "text_encoder" / "onnx" / "model.onnx"
vae_decoder_path = MODEL_DIR / "vae_decoder" / "onnx" / "model.onnx"

print(f"[SD-Turbo] UNet: {unet_path}")
print(f"[SD-Turbo] Text Encoder: {text_encoder_path}")
print(f"[SD-Turbo] VAE Decoder: {vae_decoder_path}")

providers = ['CPUExecutionProvider']
if ort.get_available_providers():
    if 'CUDAExecutionProvider' in ort.get_available_providers():
        providers.insert(0, 'CUDAExecutionProvider')
    elif 'DmlExecutionProvider' in ort.get_available_providers():
        providers.insert(0, 'DmlExecutionProvider')

print(f"[SD-Turbo] Using providers: {providers}")

print("[SD-Turbo] Loading UNet...")
unet_session = ort.InferenceSession(
    str(unet_path),
    providers=providers,
    sess_options=ort.SessionOptions()
)

print("[SD-Turbo] Loading Text Encoder...")
text_encoder_session = ort.InferenceSession(
    str(text_encoder_path),
    providers=providers,
    sess_options=ort.SessionOptions()
)

print("[SD-Turbo] Loading VAE Decoder...")
vae_decoder_session = ort.InferenceSession(
    str(vae_decoder_path),
    providers=providers,
    sess_options=ort.SessionOptions()
)

print("[SD-Turbo] Model loading complete!")

def load_tokenizer():
    vocab_path = MODEL_DIR / "tokenizer" / "vocab.json"
    merges_path = MODEL_DIR / "tokenizer" / "merges.txt"
    with open(vocab_path, 'r', encoding='utf-8') as f:
        vocab = json.load(f)
    with open(merges_path, 'r', encoding='utf-8') as f:
        merges = [line.strip() for line in f if line.strip()]
    return vocab, merges

vocab, merges = load_tokenizer()
print(f"[SD-Turbo] Tokenizer loaded: {len(vocab)} tokens, {len(merges)} merges")

def encode_text(text: str, max_length: int = 77) -> np.ndarray:
    tokens = []
    for word in text.split():
        for subword in word.split('-'):
            if subword in vocab:
                tokens.append(vocab[subword])
            else:
                tokens.append(vocab.get('<unk>', 49407))
    tokens = tokens[:max_length]
    while len(tokens) < max_length:
        tokens.append(49407)
    return np.array(tokens, dtype=np.int64)[np.newaxis, :]

def decode_image(image: np.ndarray) -> bytes:
    img = Image.fromarray(image.astype(np.uint8))
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return buffer.getvalue()

app = FastAPI(title="SD-Turbo Local Server", version="1.0.0")

@app.get("/")
async def root():
    return {
        "status": "running",
        "model": "stabilityai/sd-turbo",
        "model_dir": str(MODEL_DIR),
        "providers": providers,
        "endpoints": {
            "generate": "POST /generate (text prompt)"
        }
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/info")
async def model_info():
    return {
        "model": "stabilityai/sd-turbo",
        "model_dir": str(MODEL_DIR),
        "unet": str(unet_path),
        "text_encoder": str(text_encoder_path),
        "vae_decoder": str(vae_decoder_path),
        "providers": providers,
        "num_tokens": len(vocab),
        "num_merges": len(merges)
    }

@app.post("/generate")
async def generate_image(
    prompt: str = Form(...),
    width: int = Form(512, ge=64, le=1024),
    height: int = Form(512, ge=64, le=1024),
    num_steps: int = Form(1, ge=1, le=4),
    guidance_scale: float = Form(0.0, ge=0.0, le=20.0),
    seed: Optional[int] = Form(None)
):
    try:
        print(f"[SD-Turbo] Generating image: prompt='{prompt}', size=({width}x{height}), steps={num_steps}")
        
        if seed is not None:
            np.random.seed(seed)
        
        prompt_tokens = encode_text(prompt)
        latents_shape = [1, 4, height // 8, width // 8]
        latents = np.random.randn(*latents_shape).astype(np.float32)
        
        for step in range(num_steps):
            text_embeddings = text_encoder_session.run(None, {"input_ids": prompt_tokens})[0]
            noise_pred = unet_session.run(None, {
                "sample": latents,
                "timestep": np.array([step / (num_steps - 1)], dtype=np.float32),
                "encoder_hidden_states": text_embeddings
            })[0]
            latents = latents - 0.8 * noise_pred
        
        image = vae_decoder_session.run(None, {"sample": latents})[0][0]
        image = np.clip(image, 0, 255)
        image_bytes = decode_image(image)
        base64_str = base64.b64encode(image_bytes).decode('utf-8')
        
        print(f"[SD-Turbo] Image generated: {len(image_bytes)} bytes")
        
        return JSONResponse({
            "success": True,
            "prompt": prompt,
            "width": width,
            "height": height,
            "seed": seed,
            "image_base64": base64_str,
            "image_type": "image/png"
        })
    
    except Exception as e:
        print(f"[SD-Turbo] Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("\n" + "="*60)
    print("SD-TURBO LOCAL INFERENCE SERVER")
    print("="*60)
    print(f"Model directory: {MODEL_DIR}")
    print(f"Providers: {providers}")
    print(f"Listening on: http://localhost:8000")
    print("="*60 + "\n")
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
