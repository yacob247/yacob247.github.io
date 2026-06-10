@echo off
setlocal EnableDelayedExpansion
title Loma Shutdown
color 0C

:: ═══════════════════════════════════════════════════════════════
::  LOMA - STOP ALL SERVICES
::  Kills: cloudflared, Node server on 8085.
::  Leaves Ollama running (it's a background service).
::  Safe to run even if nothing is currently running.
:: ═══════════════════════════════════════════════════════════════

set NODE_PORT=8085

echo.
echo  ═══════════════════════════════════════
echo    LOMA  ^|  Stopping all services
echo  ═══════════════════════════════════════
echo.

:: ── 1. Stop Cloudflare tunnel ────────────────────────────────
echo [1/3] Stopping Cloudflare tunnel...
taskkill /IM cloudflared.exe /F >nul 2>&1
if %errorlevel%==0 (
    echo     Tunnel stopped.
) else (
    echo     Tunnel was not running.
)

:: ── 2. Stop Node server on port 8085 ────────────────────────
echo [2/3] Stopping Loma server on port %NODE_PORT%...
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%NODE_PORT% " ^| findstr "LISTENING"') do (
    if not "%%a"=="" (
        taskkill /PID %%a /F >nul 2>&1
        echo     Killed PID %%a.
        set FOUND=1
    )
)
if "%FOUND%"=="0" echo     Server was not running on port %NODE_PORT%.

:: ── 3. Sweep for any orphaned node processes still on 8085 ──
echo [3/3] Final sweep for orphaned processes on %NODE_PORT%...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%NODE_PORT%"') do (
    if not "%%a"=="" taskkill /PID %%a /F >nul 2>&1
)
echo     Done.

echo.
echo  All Loma services stopped.
echo  Ollama left running — stop it manually if needed:
echo    taskkill /IM ollama.exe /F
echo.
pause
endlocal