@echo off
title Loma Startup

:: Kill any ghost processes
echo Cleaning up old processes...
taskkill /IM cloudflared.exe /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1
sc stop cloudflared >nul 2>&1
sc config cloudflared start= disabled >nul 2>&1

:: Kill anything on port 8085
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8085') do taskkill /PID %%a /F >nul 2>&1

:: Start Node server in new window
echo Starting Node server...
start "Loma Node Server" cmd /k "cd /d C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main\Loma && node server.js"

:: Wait for Node to be ready
timeout /t 3 /nobreak >nul

:: Start cloudflared tunnel in new window
echo Starting cloudflared tunnel...
start "Loma Cloudflared" cmd /k "cloudflared tunnel --config C:\Users\youse\.cloudflared\config.yml run --protocol http2"

echo Done! Both windows should be running.