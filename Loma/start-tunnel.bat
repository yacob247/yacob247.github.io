@echo off
setlocal EnableDelayedExpansion
title Loma - Cloudflare Tunnel
color 0B

:: ═══════════════════════════════════════════════════════════════
::  LOMA - START CLOUDFLARE TUNNEL ONLY
::  Use this if the tunnel dropped but Node + Ollama are still up.
:: ═══════════════════════════════════════════════════════════════

set LOG_DIR=C:\Users\youse\.loma

echo.
echo  ═══════════════════════════════════════
echo    LOMA  ^|  Starting Cloudflare Tunnel
echo  ═══════════════════════════════════════
echo.

:: Ensure log dir exists
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: ── Find cloudflared ─────────────────────────────────────────
where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
        set PATH=%PATH%;C:\Program Files (x86)\cloudflared
        echo  Found cloudflared at default install path.
    ) else (
        echo  !! ERROR: cloudflared not found in PATH or default location.
        echo     Install from: https://developers.cloudflare.com/cloudflared
        pause
        exit /b 1
    )
)

:: ── Kill any stale tunnel first ──────────────────────────────
taskkill /IM cloudflared.exe /F >nul 2>&1
timeout /t 1 /nobreak >nul

:: ── Start tunnel ─────────────────────────────────────────────
echo  Starting tunnel...
start "" /min cmd /c "cloudflared tunnel run --protocol http2 >> "%LOG_DIR%\tunnel.log" 2>&1"
timeout /t 5 /nobreak >nul

tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | findstr "cloudflared.exe" >nul
if %errorlevel%==0 (
    echo  Tunnel running.  OK
    echo  Public URL: https://api.envizion.work
) else (
    echo  !! ERROR: cloudflared did not start.
    echo     Check log: %LOG_DIR%\tunnel.log
)

echo.
pause
endlocal