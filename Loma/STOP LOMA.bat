@echo off
title Loma Shutdown
color 0C
echo.
echo  ========================================
echo    LOMA - Stopping all services...
echo  ========================================
echo.

echo [1/2] Stopping PM2 servers...
call pm2 stop loma-proxy >nul 2>&1
call pm2 stop frontend >nul 2>&1
echo        Done.

echo [2/2] Stopping Cloudflare tunnel...
taskkill /IM cloudflared.exe /F >nul 2>&1
echo        Done.

echo.
echo  All services stopped. Ollama left running.
echo  (To stop Ollama too: taskkill /IM ollama.exe /F)
echo.
pause
