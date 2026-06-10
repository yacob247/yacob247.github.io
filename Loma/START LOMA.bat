@echo off
title Loma Startup
color 0A
echo.
echo  ========================================
echo    LOMA - Starting all services...
echo  ========================================
echo.

:: ── 1. Ollama ─────────────────────────────────────────────────────────
echo [1/3] Checking Ollama...
curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel%==0 (
    echo        Already running. OK.
) else (
    echo        Starting Ollama...
    start "" "ollama" serve
    timeout /t 3 /nobreak >nul
    echo        Ollama started.
)

:: ── 2. Loma Node server ───────────────────────────────────────────────
echo [2/3] Starting Loma server on port 8085...
:: Kill anything already on 8085
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8085 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)
start "" /min cmd /c "cd /d C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main\Loma && node server.js"
timeout /t 2 /nobreak >nul
echo        Loma server started.

:: ── 3. Cloudflare tunnel ──────────────────────────────────────────────
echo [3/3] Starting Cloudflare tunnel...
taskkill /IM cloudflared.exe /F >nul 2>&1
timeout /t 1 /nobreak >nul
start "" /min cmd /c "cloudflared tunnel run --protocol http2"
timeout /t 3 /nobreak >nul
echo        Tunnel started.

echo.
echo  ========================================
echo    LOMA is live!
echo    Local  : http://localhost:8085
echo    Tunnel : https://api.envizion.work
echo  ========================================
echo.
pause >nul