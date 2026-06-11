@echo off
title Loma Master Startup
setlocal

:: 1. KILL GHOST PROCESSES
echo [1/4] Cleaning up old processes...
taskkill /IM cloudflared.exe /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1

:: Kill anything specifically sitting on our main ports
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8085') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do taskkill /PID %%a /F >nul 2>&1

:: 2. ENSURE OLLAMA IS READY
echo [2/4] Checking Ollama...
netstat -ano | findstr :11434 >nul
if %errorlevel% neq 0 (
    echo [!] Ollama is not running! Starting it now...
    start "" "ollama serve"
    timeout /t 5 /nobreak >nul
)

:: 3. START NODE SERVER
echo [3/4] Starting Node server...
start "Loma Node Server" cmd /k "cd /d C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main\Loma && node server.js"

:: Wait for Node to bind to the port (loop until listening)
echo Waiting for Node to bind to 8085...
:wait_node
timeout /t 2 /nobreak >nul
netstat -ano | findstr :8085 | findstr LISTENING >nul
if %errorlevel% neq 0 goto wait_node

:: 4. START CLOUDFLARED TUNNEL
echo [4/4] Starting cloudflared tunnel...
:: Added --protocol http2 to bypass Windows QUIC/Firewall issues
start "Loma Cloudflared" cmd /k "cloudflared tunnel --config C:\Users\youse\.cloudflared\config.yml run --protocol http2"

echo.
echo ===================================================
echo   LOMA IS LIVE: https://envizion.work
echo   API IS LIVE:  https://envizion.work
echo ===================================================
pause
