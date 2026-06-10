@echo off
setlocal EnableDelayedExpansion
title Loma Startup
color 0A

:: ═══════════════════════════════════════════════════════════════
::  LOMA - START ALL SERVICES
::  Handles: cold boot, stale PIDs, Ollama not installed,
::           Node not installed, cloudflared not in PATH,
::           port already in use by something else.
:: ═══════════════════════════════════════════════════════════════

set LOMA_DIR=C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main\Loma
set LOG_DIR=C:\Users\youse\.loma
set OLLAMA_URL=http://127.0.0.1:11434
set NODE_PORT=8085
set TUNNEL_HOST=https://api.envizion.work
set MODEL=qwen2.5-coder:7b

echo.
echo  ═══════════════════════════════════════
echo    LOMA  ^|  Starting all services
echo  ═══════════════════════════════════════
echo.

:: ── Ensure log directory exists ──────────────────────────────
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
::  STEP 0  — Pre-flight: verify required tools are present
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [0/5] Pre-flight checks...

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  !! FATAL: Node.js not found in PATH.
    echo     Install from: https://nodejs.org
    echo     After installing, restart this script.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
echo     Node.js  : %NODE_VER%  OK

:: Check server.js exists
if not exist "%LOMA_DIR%\server.js" (
    echo.
    echo  !! FATAL: server.js not found at:
    echo     %LOMA_DIR%\server.js
    echo     Check the LOMA_DIR path at the top of this script.
    echo.
    pause
    exit /b 1
)
echo     server.js: found  OK

:: Check cloudflared (warn only — tunnel is optional)
set CF_OK=1
where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
    :: Try default install path
    if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
        set PATH=%PATH%;C:\Program Files (x86)\cloudflared
        echo     cloudflared: found at default path  OK
    ) else (
        set CF_OK=0
        echo     cloudflared: NOT found  ^(tunnel will be skipped^)
        echo     Install from: https://developers.cloudflare.com/cloudflared
    )
) else (
    echo     cloudflared: found in PATH  OK
)

:: Check Ollama binary
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  !! FATAL: ollama not found in PATH.
    echo     Install from: https://ollama.com
    echo     After installing, restart this script.
    echo.
    pause
    exit /b 1
)
echo     ollama   : found  OK

echo.

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
::  STEP 1  — Kill any stale processes from a previous session
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [1/5] Clearing stale processes...

:: Kill cloudflared (silently — it may not be running)
taskkill /IM cloudflared.exe /F >nul 2>&1

:: Kill anything holding port 8085
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%NODE_PORT% " ^| findstr "LISTENING"') do (
    if not "%%a"=="" (
        taskkill /PID %%a /F >nul 2>&1
        echo     Killed stale PID %%a on port %NODE_PORT%.
    )
)

timeout /t 2 /nobreak >nul
echo     Done.
echo.

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
::  STEP 2  — Start Ollama (or confirm it's already running)
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [2/5] Starting Ollama...

curl -s --max-time 3 %OLLAMA_URL%/api/tags >nul 2>&1
if %errorlevel%==0 (
    echo     Already running.  OK
) else (
    echo     Not running — launching...
    start "" "ollama" serve

    :: Wait up to 15 s for Ollama to become ready
    set OLLAMA_READY=0
    for /l %%i in (1,1,15) do (
        if !OLLAMA_READY!==0 (
            timeout /t 1 /nobreak >nul
            curl -s --max-time 2 %OLLAMA_URL%/api/tags >nul 2>&1
            if !errorlevel!==0 set OLLAMA_READY=1
        )
    )
    if !OLLAMA_READY!==1 (
        echo     Ollama started.  OK
    ) else (
        echo.
        echo  !! WARNING: Ollama did not respond after 15 s.
        echo     Check that the model is pulled:  ollama pull %MODEL%
        echo     Continuing anyway — Ollama may still be loading.
        echo.
    )
)
echo.

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
::  STEP 3  — Start Loma Node server
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [3/5] Starting Loma Node server on port %NODE_PORT%...

start "" /min cmd /c "cd /d "%LOMA_DIR%" && node server.js >> "%LOG_DIR%\server.log" 2>&1"

:: Wait up to 10 s for port to bind
set NODE_READY=0
for /l %%i in (1,1,10) do (
    if !NODE_READY!==0 (
        timeout /t 1 /nobreak >nul
        netstat -ano 2>nul | findstr ":%NODE_PORT% " | findstr "LISTENING" >nul 2>&1
        if !errorlevel!==0 set NODE_READY=1
    )
)

if !NODE_READY!==1 (
    echo     Server on port %NODE_PORT%.  OK
) else (
    echo.
    echo  !! ERROR: Node server did not bind to port %NODE_PORT%.
    echo     Common causes:
    echo       - Node modules missing. Run in Loma folder:  npm install
    echo       - server.js has a syntax error. Run:  node server.js
    echo       - Port still held by another app.
    echo     Log: %LOG_DIR%\server.log
    echo.
    pause
    exit /b 1
)
echo.

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
::  STEP 4  — Start Cloudflare tunnel
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [4/5] Starting Cloudflare tunnel...

if "%CF_OK%"=="0" (
    echo     Skipped — cloudflared not installed.
) else (
    start "" /min cmd /c "cloudflared tunnel run --protocol http2 >> "%LOG_DIR%\tunnel.log" 2>&1"
    timeout /t 5 /nobreak >nul

    tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | findstr "cloudflared.exe" >nul
    if %errorlevel%==0 (
        echo     Tunnel process running.  OK
    ) else (
        echo     WARNING: cloudflared process not found after start.
        echo     Check: %LOG_DIR%\tunnel.log
    )
)
echo.

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
::  STEP 5  — End-to-end API smoke test
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [5/5] API smoke test...

curl -s --max-time 10 -X POST http://localhost:%NODE_PORT%/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"%MODEL%\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"stream\":true}" ^
  | findstr "data:" >nul 2>&1

if %errorlevel%==0 (
    echo     API responding.  ALL GOOD
) else (
    echo     WARNING: API test failed.
    echo     If model is not pulled yet, run:  ollama pull %MODEL%
    echo     The server IS running; this may resolve itself in a moment.
)

echo.
echo  ═══════════════════════════════════════
echo    LOMA is live!
echo    Local  : http://localhost:%NODE_PORT%
echo    Tunnel : %TUNNEL_HOST%
echo    Logs   : %LOG_DIR%\
echo  ═══════════════════════════════════════
echo.
echo  Press any key to close this window...
pause >nul
endlocal