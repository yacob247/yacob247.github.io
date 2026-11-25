# ============ ViT-GPT2 captioner: download + verify + upload to R2 ============
$repo = "https://huggingface.co/Xenova/vit-gpt2-image-captioning/resolve/main"
$dir  = "vit_gpt2"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$files = @(
    'onnx/encoder_model_quantized.onnx',        # 87.5 MB
    'onnx/decoder_model_merged_quantized.onnx', # 158.6 MB
    'config.json','generation_config.json',
    'tokenizer.json','vocab.json','merges.txt','preprocessor_config.json'
)

# --- cleanup: remove the fake 15-byte blip files locally and in R2 ---
Remove-Item blip_models -Recurse -Force -ErrorAction SilentlyContinue
rclone delete r2:images-ai/blip/ 2>$null

# --- download with resume + progress ---
$allOk = $true
foreach ($f in $files) {
    $out = Join-Path $dir ($f -replace '/', '_')
    if ((Test-Path $out) -and ((Get-Item $out).Length -gt 1MB)) {
        Write-Host "[SKIP] $f already done ($([math]::Round((Get-Item $out).Length/1MB,1)) MB)" -ForegroundColor DarkGray
        continue
    }
    Write-Host "[GET ] $f" -ForegroundColor Cyan
    curl.exe -L --progress-bar --retry 3 -C - -o $out "$repo/$f"
    if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: $f" -ForegroundColor Red; $allOk = $false }
}

# --- VERIFY: refuse to upload garbage (this is what caught the 404s last time) ---
Write-Host "`n=== Verify ===" -ForegroundColor Yellow
foreach ($f in $files) {
    $p = Join-Path $dir ($f -replace '/', '_')
    $mb = if (Test-Path $p) { (Get-Item $p).Length/1MB } else { 0 }
    $ok = $mb -gt 0.0005
    if (-not $ok) { $allOk = $false }
    Write-Host ("{0,-45} {1,8:N2} MB  {2}" -f $f, $mb, $(if ($ok) {'OK'} else {'TOO SMALL - BAD'})) -ForegroundColor $(if ($ok) {'Green'} else {'Red'})
}

# --- upload to R2 ---
if ($allOk) {
    Write-Host "`n=== Uploading to r2:images-ai/vit-gpt2/ ===" -ForegroundColor Yellow
    rclone copy (Join-Path $dir 'onnx') r2:images-ai/vit-gpt2/onnx/ --progress
    foreach ($x in ($files | ? { $_ -notmatch '^onnx/' })) {
        rclone copyto (Join-Path $dir ($x -replace '/','_')) "r2:images-ai/vit-gpt2/$x"
    }
    Write-Host "`nDONE. Verify:" -ForegroundColor Green
    rclone ls r2:images-ai/vit-gpt2/
} else {
    Write-Host "`nDownloads failed/incomplete - re-run .\vit.ps1, it resumes where it left off." -ForegroundColor Red
}
