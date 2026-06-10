@echo off
title Loma Startup
color 0A
echo.
echo  ========================================
echo    LOMA - Starting all services...
echo  ========================================
echo.

:: ── 1. Start Ollama (if not already running) ─────────────────────────
echo [1/3] Checking Ollama...
curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel%==0 (
    echo        Ollama already running. OK.
) else (
    echo        Starting Ollama...
    start "" "ollama" serve
    timeout /t 3 /nobreak >nul
    echo        Ollama started.
)

:: ── 2. Start Cloudflare Tunnel ────────────────────────────────────────
echo [2/3] Starting Cloudflare tunnel...
start "" /min cmd /c "cloudflared tunnel run"
timeout /t 2 /nobreak >nul
echo        Tunnel started.

:: ── 3. Start PM2 (loma-proxy + frontend) ─────────────────────────────
echo [3/3] Starting PM2 servers...
call pm2 start C:\Users\youse\.pm2\dump.pm2 >nul 2>&1
call pm2 resurrect >nul 2>&1
call pm2 restart loma-proxy >nul 2>&1
call pm2 restart frontend >nul 2>&1
echo        Servers started.

echo.
echo  ========================================
echo    LOMA is running!
echo    Frontend : http://localhost:8080
echo    API      : http://localhost:8081
echo    Tunnel   : https://envizion.work
echo  ========================================
echo.
echo  Press any key to open Loma in your browser...
pause >nul
start "" "https://envizion.work"
