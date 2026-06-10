@echo off
title Loma Fix / Reset
color 0E
echo.
echo  ========================================
echo    LOMA - Force reset all services...
echo  ========================================
echo.

:: ── STEP 1: Nuclear kill everything relevant ──────────────────────────────────
echo [1/5] Force killing all related processes...

taskkill /IM cloudflared.exe /F >nul 2>&1
echo        cloudflared killed.

:: Kill anything on 8085 (Node / Live Server / anything)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8085 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
    echo        Killed PID %%a on port 8085.
)

:: Kill anything on 8081 that might be Live Server interfering
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
    echo        Killed PID %%a on port 8081 (Live Server stale).
)

timeout /t 2 /nobreak >nul
echo        All killed.

:: ── STEP 2: Verify config.yml points to 8085 ─────────────────────────────────
echo [2/5] Checking Cloudflare config...
findstr "8085" "C:\Users\youse\.cloudflared\config.yml" >nul 2>&1
if %errorlevel%==0 (
    echo        config.yml has 8085. OK.
) else (
    echo.
    echo  !! WARNING: config.yml does NOT contain 8085 !!
    echo     Open C:\Users\youse\.cloudflared\config.yml
    echo     Change api.envizion.work service to: http://127.0.0.1:8085
    echo     Then press any key to continue...
    pause >nul
)

:: ── STEP 3: Create log dir ────────────────────────────────────────────────────
if not exist "C:\Users\youse\.loma" mkdir "C:\Users\youse\.loma"

:: ── STEP 4: Start Ollama if not running ──────────────────────────────────────
echo [3/5] Checking Ollama...
curl -s --max-time 3 http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel%==0 (
    echo        Ollama already running. OK.
) else (
    echo        Starting Ollama...
    start "" "ollama" serve
    timeout /t 4 /nobreak >nul
    echo        Ollama started.
)

:: ── STEP 5: Start Loma Node server ───────────────────────────────────────────
echo [4/5] Starting Loma Node server...
start "" /min cmd /c "cd /d C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main\Loma && node server.js >> C:\Users\youse\.loma\server.log 2>&1"
timeout /t 3 /nobreak >nul

netstat -ano | findstr ":8085 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo        Server on 8085. OK.
) else (
    echo.
    echo  !! ERROR: Node server failed to start on 8085 !!
    echo     Check: is Node installed? Run: node --version
    echo     Check: is server.js in the Loma folder?
    echo     Try running manually in a new terminal:
    echo     cd C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main\Loma
    echo     node server.js
    echo.
    pause
    exit /b 1
)

:: ── STEP 6: Start Cloudflare tunnel ──────────────────────────────────────────
echo [5/5] Starting Cloudflare tunnel...
start "" /min cmd /c "cloudflared tunnel run --protocol http2 >> C:\Users\youse\.loma\tunnel.log 2>&1"
timeout /t 5 /nobreak >nul

tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | findstr "cloudflared.exe" >nul
if %errorlevel%==0 (
    echo        Tunnel running. OK.
) else (
    echo        WARNING: cloudflared not found. Is it in PATH?
)

:: ── FINAL: End-to-end API test ────────────────────────────────────────────────
echo.
echo  Testing API end-to-end...
curl -s --max-time 8 -X POST http://localhost:8085/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"qwen2.5-coder:7b\",\"messages\":[{\"role\":\"user\",\"content\":\"ping\"}],\"stream\":true}" ^
  | findstr "data:" >nul 2>&1
if %errorlevel%==0 (
    echo  API test PASSED. Loma is working!
) else (
    echo  API test FAILED. Ollama model may not be pulled.
    echo  Run: ollama pull qwen2.5-coder:7b
    echo  Then run this fix script again.
)

echo.
echo  ========================================
echo    Reset complete!
echo    Local  : http://localhost:8085
echo    Tunnel : https://api.envizion.work
echo    Logs   : C:\Users\youse\.loma\
echo  ========================================
echo.
pause