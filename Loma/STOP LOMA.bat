@echo off
title Loma Shutdown
color 0C
echo.
echo  ========================================
echo    LOMA - Stopping all services...
echo  ========================================
echo.

:: ── 1. Stop Cloudflare tunnel ────────────────────────────────────────────────
echo [1/3] Stopping Cloudflare tunnel...
taskkill /IM cloudflared.exe /F >nul 2>&1
if %errorlevel%==0 (
    echo        Tunnel stopped.
) else (
    echo        Tunnel was not running.
)

:: ── 2. Stop Loma Node server on 8085 ─────────────────────────────────────────
echo [2/3] Stopping Loma server (port 8085)...
set found=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8085 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
    set found=1
)
if "%found%"=="1" (
    echo        Server stopped.
) else (
    echo        Server was not running.
)

:: ── 3. Kill any orphaned node processes bound to 8085 ────────────────────────
echo [3/3] Cleaning up any orphaned processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8085"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo        Done.

echo.
echo  All Loma services stopped.
echo  Ollama left running (stop manually if needed).
echo  To stop Ollama: taskkill /IM ollama.exe /F
echo.
pause