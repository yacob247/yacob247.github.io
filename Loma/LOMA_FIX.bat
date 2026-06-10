@echo off
setlocal EnableDelayedExpansion
title Loma Fix / Deep Reset
color 0E

:: ═══════════════════════════════════════════════════════════════
::  LOMA - DEEP RESET  (run this when anything is broken)
::
::  What it does:
::    1. Kills everything: cloudflared, any process on 8085/8081
::    2. Validates all required tools (Node, ollama, cloudflared)
::    3. Validates config.yml points to port 8085
::    4. Checks node_modules exist; installs them if missing
::    5. Starts Ollama, waits for it to respond
::    6. Starts Node server, waits for port to bind
::    7. Starts Cloudflare tunnel
::    8. Runs end-to-end API test with clear pass/fail guidance
:: ═══════════════════════════════════════════════════════════════

set LOMA_DIR=C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main\Loma
set LOG_DIR=C:\Users\youse\.loma
set CF_CONFIG=C:\Users\youse\.cloudflared\config.yml
set OLLAMA_URL=http://127.0.0.1:11434
set NODE_PORT=8085
set MODEL=qwen2.5-coder:7b

echo.
echo  ═══════════════════════════════════════════════
echo    LOMA  ^|  Deep Reset  —  Fixing everything...
echo  ═══════════════════════════════════════════════
echo.

:: Ensure log directory exists
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
::  STEP 1  — Nuclear kill everything relevant
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [1/7] Force-killing all related processes...

taskkill /IM cloudflared.exe /F >nul 2>&1
echo     cloudflared killed ^(or was not running^).

:: Kill port 8085
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%NODE_PORT% " ^| findstr "LISTENING"') do (
    if not "%%a"=="" (
        taskkill /PID %%a /F >nul 2>&1
        echo     Killed PID %%a on port %NODE_PORT%.
    )
)

:: Kill stale Live Server on 8081 if present
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8081 " ^| findstr "LISTENING"') do (
    if not "%%a"=="" (
        taskkill /PID %%a /F >nul 2>&1
        echo     Killed stale PID %%a on port 8081.
    )
)

timeout /t 2 /nobreak >nul
echo     All clear.
echo.

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
::  STEP 2  — Validate required tools
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [2/7] Validating required tools...
set ABORT=0

:: Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  !! MISSING: Node.js not found in PATH.
    echo     Install from: https://nodejs.org  then re-run this script.
    set ABORT=1
) else (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do echo     Node.js  : %%v  OK
)

:: server.js
if not exist "%LOMA_DIR%\server.js" (
    echo  !! MISSING: server.js not found at %LOMA_DIR%
    echo     Check that LOMA_DIR at the top of this script is correct.
    set ABORT=1
) else (
    echo     server.js: found  OK
)

:: Ollama
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo  !! MISSING: ollama not found in PATH.
    echo     Install from: https://ollama.com  then re-run this script.
    set ABORT=1
) else (
    echo     ollama   : found  OK
)

:: cloudflared (non-fatal — adds to PATH if found at default location)
set CF_OK=1
where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
        set PATH=%PATH%;C:\Program Files (x86)\cloudflared
        echo     cloudflared: added default path to session PATH  OK
    ) else (
        set CF_OK=0
        echo     cloudflared: NOT found — tunnel step will be skipped.
    )
) else (
    echo     cloudflared: found  OK
)

if "%ABORT%"=="1" (
    echo.
    echo  Fix the missing tools above, then re-run LOMA_FIX.bat.
    pause
    exit /b 1
)
echo.

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
::  STEP 3  — Verify Cloudflare config.yml targets port 8085
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [3/7] Checking Cloudflare config.yml...

if not exist "%CF_CONFIG%" (
    echo     config.yml not found at %CF_CONFIG% — skipping check.
) else (
    findstr "%NODE_PORT%" "%CF_CONFIG%" >nul 2>&1
    if %errorlevel%==0 (
        echo     config.yml points to port %NODE_PORT%.  OK
    ) else (
        echo.
        echo  !! WARNING: config.yml does NOT reference port %NODE_PORT%.
        echo     Open: %CF_CONFIG%
        echo     Find the ingress rule for api.envizion.work and set:
        echo       service: http://127.0.0.1:%NODE_PORT%
        echo.
        echo     Press any key once you have fixed config.yml...
        pause >nul
    )
)
echo.

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
::  STEP 4  — Check / install node_modules
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [4/7] Checking node_modules...

if not exist "%LOMA_DIR%\node_modules" (
    echo     node_modules missing — running npm install...
    cd /d "%LOMA_DIR%"
    npm install
    if %errorlevel% neq 0 (
        echo.
        echo  !! ERROR: npm install failed. Check internet connection.
        pause
        exit /b 1
    )
    echo     npm install complete.  OK
) else (
    echo     node_modules present.  OK
)

:: Also check package.json type=module (required for ESM import in server.js)
if exist "%LOMA_DIR%\package.json" (
    findstr /I "module" "%LOMA_DIR%\package.json" >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo  !! WARNING: package.json may be missing  "type": "module"
        echo     server.js uses ESM imports (import/export syntax).
        echo     Open %LOMA_DIR%\package.json and ensure it contains:
        echo       "type": "module"
        echo.
    )
)
echo.

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
::  STEP 5  — Start Ollama
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [5/7] Starting Ollama...

curl -s --max-time 3 %OLLAMA_URL%/api/tags >nul 2>&1
if %errorlevel%==0 (
    echo     Already running.  OK
) else (
    echo     Launching ollama serve...
    start "" "ollama" serve

    set OLLAMA_READY=0
    for /l %%i in (1,1,20) do (
        if !OLLAMA_READY!==0 (
            timeout /t 1 /nobreak >nul
            curl -s --max-time 2 %OLLAMA_URL%/api/tags >nul 2>&1
            if !errorlevel!==0 set OLLAMA_READY=1
        )
    )

    if !OLLAMA_READY!==1 (
        echo     Ollama ready.  OK
    ) else (
        echo.
        echo  !! WARNING: Ollama not responding after 20 s.
        echo     If this is a fresh install, model may still be loading.
        echo     Required model:  ollama pull %MODEL%
        echo     Continuing — server will retry connections on its own.
        echo.
    )
)
echo.

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
::  STEP 6  — Start Loma Node server
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [6/7] Starting Loma Node server...

start "" /min cmd /c "cd /d "%LOMA_DIR%" && node server.js >> "%LOG_DIR%\server.log" 2>&1"

:: Wait up to 12 s for port binding
set NODE_READY=0
for /l %%i in (1,1,12) do (
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
    echo     Diagnostics:
    echo       1. Open a new terminal and run:
    echo             cd "%LOMA_DIR%"
    echo             node server.js
    echo          Look at the actual error message.
    echo       2. Common fixes:
    echo          - Missing  "type": "module"  in package.json
    echo          - Run npm install in the Loma folder
    echo          - Port still blocked — wait 30 s and re-run this script
    echo       3. Check server log: %LOG_DIR%\server.log
    echo.
    pause
    exit /b 1
)
echo.

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
::  STEP 7  — Start Cloudflare tunnel
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo [7/7] Starting Cloudflare tunnel...

if "%CF_OK%"=="0" (
    echo     Skipped — cloudflared not installed.
) else (
    start "" /min cmd /c "cloudflared tunnel run --protocol http2 >> "%LOG_DIR%\tunnel.log" 2>&1"
    timeout /t 6 /nobreak >nul

    tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | findstr "cloudflared.exe" >nul
    if %errorlevel%==0 (
        echo     Tunnel running.  OK
    ) else (
        echo     WARNING: cloudflared not running after start.
        echo     Check: %LOG_DIR%\tunnel.log
    )
)
echo.

:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
::  FINAL — End-to-end API test
:: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  Running end-to-end API test...
curl -s --max-time 12 -X POST http://localhost:%NODE_PORT%/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"%MODEL%\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"stream\":true}" ^
  | findstr "data:" >nul 2>&1

if %errorlevel%==0 (
    echo  API test PASSED.  Loma is fully working!
) else (
    echo  API test FAILED.
    echo.
    echo  Most likely cause: model not pulled yet.
    echo  Fix:  ollama pull %MODEL%
    echo  Then re-run this script — everything else is already running.
)

echo.
echo  ═══════════════════════════════════════════════
echo    Deep Reset complete!
echo    Local  : http://localhost:%NODE_PORT%
echo    Tunnel : https://api.envizion.work
echo    Logs   : %LOG_DIR%\
echo  ═══════════════════════════════════════════════
echo.
pause
endlocal