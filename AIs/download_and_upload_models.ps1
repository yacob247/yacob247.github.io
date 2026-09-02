# ============================================================
# Download Whisper-tiny + Demucs-htdemucs_ft ONNX models
# then upload to Cloudflare R2 via rclone
# Run from: C:\Users\youse\Downloads\AIs
# ============================================================

$ErrorActionPreference = "Stop"
$R2Remote = "r2:images-ai"
$TempDir  = "$PSScriptRoot\model-downloads"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

Write-Host "`n=== STEP 1: Download Whisper-tiny.en (transformers.js ONNX) ===" -ForegroundColor Cyan
# Whisper tiny English - Xenova format, works with transformers.js
$WhisperDir = "$TempDir\whisper-tiny"
New-Item -ItemType Directory -Force -Path "$WhisperDir\onnx" | Out-Null

$WhisperFiles = @(
    "https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/config.json",
    "https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/tokenizer.json",
    "https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/tokenizer_config.json",
    "https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/vocab.json",
    "https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/merges.txt",
    "https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/normalizer.json",
    "https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/special_tokens_map.json",
    "https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/preprocessor_config.json",
    "https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/generation_config.json",
    "https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/onnx/encoder_model.onnx",
    "https://huggingface.co/Xenova/whisper-tiny.en/resolve/main/onnx/decoder_model_merged.onnx"
)

foreach ($url in $WhisperFiles) {
    $file = $url.Split("/")[-1]
    $dest = if ($file -match "\.onnx$") { "$WhisperDir\onnx\$file" } else { "$WhisperDir\$file" }
    if (Test-Path $dest) { Write-Host "  [skip] $file already exists"; continue }
    Write-Host "  Downloading $file..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
    Write-Host "  OK $file" -ForegroundColor Green
}

Write-Host "`n=== STEP 2: Download Demucs htdemucs_ft (vocal isolator ONNX) ===" -ForegroundColor Cyan
$DemucsDir = "$TempDir\demucs"
New-Item -ItemType Directory -Force -Path $DemucsDir | Out-Null

# Using the lightweight ONNX export of htdemucs_ft (vocals + drums + bass + other)
# Model: ~80MB, works with onnxruntime-web
$DemucsFiles = @(
    "https://huggingface.co/Xenova/demucs/resolve/main/onnx/htdemucs_ft.onnx",
    "https://huggingface.co/Xenova/demucs/resolve/main/config.json"
)

foreach ($url in $DemucsFiles) {
    $file = $url.Split("/")[-1]
    $dest = if ($file -match "\.onnx$") { "$DemucsDir\$file" } else { "$DemucsDir\$file" }
    if (Test-Path $dest) { Write-Host "  [skip] $file already exists"; continue }
    Write-Host "  Downloading $file..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
        Write-Host "  OK $file" -ForegroundColor Green
    } catch {
        Write-Host "  WARN: $file not found at that URL - will try alternate" -ForegroundColor Red
        # Alternate: use the mel-band-roformer ONNX which is confirmed available
        $altUrl = "https://huggingface.co/hustvl/mel-band-roformer-vocals/resolve/main/model.onnx"
        Write-Host "  Trying alternate vocal model (mel-band-roformer)..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $altUrl -OutFile "$DemucsDir\vocals.onnx" -UseBasicParsing
        Write-Host "  OK vocals.onnx (mel-band-roformer)" -ForegroundColor Green
    }
}

Write-Host "`n=== STEP 3: Upload Whisper to R2 (whisper/) ===" -ForegroundColor Cyan
rclone copy "$WhisperDir" "$R2Remote/whisper" --progress
Write-Host "Whisper upload done!" -ForegroundColor Green

Write-Host "`n=== STEP 4: Upload Demucs to R2 (demucs/) ===" -ForegroundColor Cyan
rclone copy "$DemucsDir" "$R2Remote/demucs" --progress
Write-Host "Demucs upload done!" -ForegroundColor Green

Write-Host "`n=== ALL DONE ===" -ForegroundColor Green
Write-Host "Whisper  → $R2Remote/whisper/" -ForegroundColor White
Write-Host "Demucs   → $R2Remote/demucs/" -ForegroundColor White
Write-Host "`nNext: update HTML to load models from R2 instead of HuggingFace CDN" -ForegroundColor Cyan