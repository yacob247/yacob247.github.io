@echo off
title Loma Startup
color 0A
echo.
echo  ========================================
echo    LOMA - Starting all services...
echo  ========================================
echo.

:: ── 1. Kill any stale processes first ────────────────────────────────────────
echo [0/4] Cleaning stale processes...
taskkill /IM cloudflared.exe /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8085 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul
echo        Done.

:: ── 2. Ollama ─────────────────────────────────────────────────────────────────
echo [1/4] Checking Ollama...
curl -s --max-time 3 http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel%==0 (
    echo        Already running. OK.
) else (
    echo        Starting Ollama...
    start "" "ollama" serve
    timeout /t 4 /nobreak >nul
    curl -s --max-time 3 http://127.0.0.1:11434/api/tags >nul 2>&1
    if %errorlevel%==0 (
        echo        Ollama started OK.
    ) else (
        echo        WARNING: Ollama may not have started. Check manually.
    )
)

:: ── 3. Loma Node server ───────────────────────────────────────────────────────
echo [2/4] Starting Loma Node server on port 8085...
start "" /min cmd /c "cd /d C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main\Loma && node server.js >> C:\Users\youse\.loma\server.log 2>&1"
timeout /t 3 /nobreak >nul

:: Verify it actually bound to 8085
netstat -ano | findstr ":8085 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo        Loma server running on 8085. OK.
) else (
    echo        ERROR: Server did not start on 8085. Check node is installed.
    echo        Try running manually: node server.js
    pause
    exit /b 1
)

:: ── 4. Cloudflare tunnel ──────────────────────────────────────────────────────
echo [3/4] Starting Cloudflare tunnel...
start "" /min cmd /c "cloudflared tunnel run --protocol http2 >> C:\Users\youse\.loma\tunnel.log 2>&1"
timeout /t 4 /nobreak >nul

:: Verify tunnel process is alive
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | findstr "cloudflared.exe" >nul
if %errorlevel%==0 (
    echo        Tunnel running. OK.
) else (
    echo        WARNING: cloudflared may not have started. Check PATH.
)

:: ── 5. Verify end-to-end ─────────────────────────────────────────────────────
echo [4/4] Verifying local API...
curl -s --max-time 5 -X POST http://localhost:8085/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"qwen2.5-coder:7b\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"stream\":true}" ^
  | findstr "data:" >nul 2>&1
if %errorlevel%==0 (
    echo        API responding. All good!
) else (
    echo        WARNING: API test failed. Ollama model may not be loaded.
    echo        Run: ollama pull qwen2.5-coder:7b
)

:: ── Create log dir if missing ─────────────────────────────────────────────────
if not exist "C:\Users\youse\.loma" mkdir "C:\Users\youse\.loma"

echo.
echo  ========================================
echo    LOMA is live!
echo    Local  : http://localhost:8085
echo    Tunnel : https://api.envizion.work
echo  ========================================
echo.
echo  Press any key to close this window...
pause >nul