@echo off
title LOMA NUKE + RESTART

:: ── KILL EVERYTHING ──────────────────────────────────────────────
echo [1/4] Killing all processes...
taskkill /F /IM ollama.exe        >nul 2>&1
taskkill /F /IM node.exe          >nul 2>&1
taskkill /F /IM cloudflared.exe   >nul 2>&1
timeout /t 2 >nul

:: ── START OLLAMA ─────────────────────────────────────────────────
echo [2/4] Starting Ollama...
start "" ollama serve
timeout /t 4 >nul

:: ── START NODE SERVER ON 8085 ────────────────────────────────────
echo [3/4] Starting Node server on :8085...
cd /d "C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main\Loma"
start "" cmd /k "node server.js"
timeout /t 3 >nul

:: ── START CLOUDFLARE TUNNEL (HTTP/2 only, config inside Loma folder) ──
echo [4/4] Starting Cloudflare tunnel (HTTP/2)...
start "" cloudflared tunnel --config "C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main\Loma\config.yml" --protocol http2 run

echo.
echo  Loma LIVE ^> http://127.0.0.1:8085
echo  Tunnel    ^> https://api.envizion.work
pause
