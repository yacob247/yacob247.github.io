@echo off
title Loma Shutdown
color 0C
echo.
echo  ========================================
echo    LOMA - Stopping all services...
echo  ========================================
echo.

echo [1/2] Stopping Loma server (port 8085)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8085 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo        Done.

echo [2/2] Stopping Cloudflare tunnel...
taskkill /IM cloudflared.exe /F >nul 2>&1
echo      fix and start and stop  Done.

echo.
echo  All stopped. Ollama left running.
echo.
pause