@echo off
title Loma Master Startup
setlocal EnableDelayedExpansion
color 0A

echo.
echo  ██████████████████████████████████████████
echo     LOMA MASTER STARTUP - BULLETPROOF MODE
echo  ██████████████████████████████████████████
echo.

:: ============================================================
:: STEP 1: NUCLEAR CLEANUP - Kill EVERYTHING that could conflict
:: ============================================================
echo [1/5] Nuclear cleanup of all ghost processes...

:: Kill all cloudflared instances (multiple passes to ensure death)
for /L %%i in (1,1,3) do (
    taskkill /IM cloudflared.exe /F /T >nul 2>&1
    timeout /t 1 /nobreak >nul
)

:: Kill node instances
for /L %%i in (1,1,3) do (
    taskkill /IM node.exe /F /T >nul 2>&1
    timeout /t 1 /nobreak >nul
)

:: Kill by port - be thorough across all relevant ports
for %%p in (8085 8080 8443 3000) do (
    for /f "tokens=5 delims= " %%a in ('netstat -ano 2^>nul ^| findstr ":%%p "') do (
        if not "%%a"=="" (
            taskkill /PID %%a /F >nul 2>&1
        )
    )
)

:: Use PowerShell for deep process kill (catches things taskkill misses)
powershell -NoProfile -Command "Get-Process -Name 'cloudflared','node' -ErrorAction SilentlyContinue | Stop-Process -Force" >nul 2>&1

:: Wait for ports to fully release
echo Waiting for ports to release...
timeout /t 3 /nobreak >nul

:: Verify cleanup
netstat -ano | findstr ":8085 " | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [!] Port 8085 still occupied - forcing with PowerShell...
    powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8085 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
    timeout /t 2 /nobreak >nul
)

echo [OK] Cleanup complete.

:: ============================================================
:: STEP 2: ENSURE OLLAMA IS READY
:: ============================================================
echo [2/5] Checking Ollama...
netstat -ano | findstr ":11434 " | findstr LISTENING >nul
if %errorlevel% neq 0 (
    echo [!] Ollama not running - starting it...
    start "" "ollama" serve
    :: Wait up to 30 seconds for Ollama
    set /a ollama_wait=0
    :wait_ollama
    timeout /t 2 /nobreak >nul
    netstat -ano | findstr ":11434 " | findstr LISTENING >nul
    if %errorlevel% neq 0 (
        set /a ollama_wait+=1
        if !ollama_wait! lss 15 goto wait_ollama
        echo [WARN] Ollama did not start in time - continuing anyway...
    ) else (
        echo [OK] Ollama is ready.
    )
) else (
    echo [OK] Ollama already running.
)

:: ============================================================
:: STEP 3: START NODE SERVER
:: ============================================================
echo [3/5] Starting Node server...
set NODE_DIR=C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main\Loma
set NODE_PORT=8085

if not exist "%NODE_DIR%\server.js" (
    echo [ERROR] server.js not found at %NODE_DIR%
    echo Please check the path and try again.
    pause
    exit /b 1
)

start "Loma Node Server" cmd /k "cd /d "%NODE_DIR%" && node --max-old-space-size=512 server.js || (timeout /t 3 && node server.js)"

:: Wait for Node to bind - up to 60 seconds with increasing patience
echo Waiting for Node to bind to port %NODE_PORT%...
set /a node_wait=0
:wait_node
timeout /t 2 /nobreak >nul
netstat -ano | findstr ":%NODE_PORT% " | findstr LISTENING >nul
if %errorlevel% neq 0 (
    set /a node_wait+=1
    if !node_wait! lss 30 (
        if !node_wait! equ 10 echo [INFO] Still waiting for Node... (!node_wait!/30^)
        if !node_wait! equ 20 echo [INFO] Still waiting for Node... (!node_wait!/30^)
        goto wait_node
    )
    echo [ERROR] Node server failed to start on port %NODE_PORT% after 60 seconds!
    echo Check the Node Server window for errors.
    pause
    exit /b 1
)
echo [OK] Node server is live on port %NODE_PORT%.

:: ============================================================
:: STEP 4: START CLOUDFLARED WITH SMART PROTOCOL FALLBACK
:: ============================================================
echo [4/5] Starting cloudflared tunnel with smart protocol selection...

set CF_CONFIG=C:\Users\youse\.cloudflared\config.yml
set CF_TUNNEL_CMD=cloudflared tunnel --config "%CF_CONFIG%"

:: Check if config exists
if not exist "%CF_CONFIG%" (
    echo [ERROR] Cloudflare config not found: %CF_CONFIG%
    echo Falling back to direct tunnel mode...
start "Loma Cloudflared" cmd /k "cloudflared tunnel --protocol http2 --edge-ip-version 4 --retries 10 run || cloudflared tunnel --protocol auto run"
    goto cf_started
)

:: Try HTTP/2 first (since your logs show QUIC failing on region2)
:: The --edge-ip-version=4 forces IPv4 which avoids many connection issues
start "Loma Cloudflared" cmd /k "cloudflared tunnel --config "%CF_CONFIG%" --protocol http2 --edge-ip-version 4 --retries 10 --grace-period 30s run || cloudflared tunnel --config "%CF_CONFIG%" --protocol auto run"
:cf_started
echo [OK] Cloudflared started.

:: ============================================================
:: STEP 5: LAUNCH POWERSHELL WATCHDOG (keeps everything alive)
:: ============================================================
echo [5/5] Launching watchdog process...

:: Write the watchdog script dynamically
set WATCHDOG_PATH=%TEMP%\loma_watchdog.ps1

(
echo # Loma Watchdog - Keeps Node and Cloudflared alive forever
echo $NodeDir = "C:\Users\youse\Downloads\yacob247.github.io-main\yacob247.github.io-main\Loma"
echo $CfConfig = "C:\Users\youse\.cloudflared\config.yml"
echo $LogFile = "$env:TEMP\loma_watchdog.log"
echo.
echo function Write-Log {
echo     param($msg^)
echo     $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
echo     "$timestamp - $msg" ^| Tee-Object -FilePath $LogFile -Append
echo }
echo.
echo function Test-Port {
echo     param($port^)
echo     $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
echo     return $conn -ne $null
echo }
echo.
echo function Start-NodeServer {
echo     Write-Log "Starting Node server..."
echo     Start-Process "cmd" -ArgumentList "/k cd /d `"$NodeDir`" && node server.js" -WindowStyle Normal
echo     Start-Sleep -Seconds 5
echo }
echo.
echo function Start-CloudflaredTunnel {
echo     Write-Log "Starting cloudflared tunnel..."
echo     # Try HTTP2 first
echo     $args1 = "tunnel --config `"$CfConfig`" --protocol http2 --edge-ip-version 4 run"
echo     Start-Process "cloudflared" -ArgumentList $args1 -WindowStyle Normal
echo     Start-Sleep -Seconds 8
echo     # Verify it connected
echo     $cf = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
echo     if (-not $cf^) {
echo         Write-Log "HTTP2 failed, trying auto protocol..."
echo         Start-Process "cloudflared" -ArgumentList "tunnel --config `"$CfConfig`" run" -WindowStyle Normal
echo     }
echo }
echo.
echo Write-Log "=== Loma Watchdog Started ==="
echo.
echo while ($true^) {
echo     # Check Node
echo     if (-not (Test-Port 8085^)^) {
echo         Write-Log "[ALERT] Node server down! Restarting..."
echo         Get-Process -Name "node" -ErrorAction SilentlyContinue ^| Stop-Process -Force
echo         Start-Sleep -Seconds 2
echo         Start-NodeServer
echo     }
echo.
echo     # Check Cloudflared - process AND connectivity
echo     $cfProc = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
echo     $cfConn = Test-NetConnection -ComputerName region1.v2.argotunnel.com -Port 443 -InformationLevel Quiet -ErrorAction SilentlyContinue
echo     if (-not $cfProc -or -not $cfConn^) {
echo         Write-Log "[ALERT] Cloudflared down or disconnected! Restarting..."
echo         Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue ^| Stop-Process -Force
echo         Start-Sleep -Seconds 3
echo         Start-CloudflaredTunnel
echo     }
echo.
echo     # Check Ollama
echo     if (-not (Test-Port 11434^)^) {
echo         Write-Log "[ALERT] Ollama down! Restarting..."
echo         Start-Process "ollama" -ArgumentList "serve" -WindowStyle Minimized
echo     }
echo.
echo     Start-Sleep -Seconds 8
echo }
) > "%WATCHDOG_PATH%"

:: Launch watchdog in minimized PowerShell window
start "Loma Watchdog" /MIN powershell -NoProfile -ExecutionPolicy Bypass -File "%WATCHDOG_PATH%"

:: ============================================================
:: FINAL STATUS
:: ============================================================
echo.
echo ============================================================
echo   LOMA IS LIVE:     https://envizion.work
echo   API IS LIVE:      https://envizion.work
echo   WATCHDOG LOG:     %TEMP%\loma_watchdog.log
echo   NODE PORT:        8085
echo   OLLAMA PORT:      11434
echo ============================================================
echo.
echo   All services are running. Watchdog will auto-restart
echo   anything that crashes. This window can be closed.
echo.
echo   To view watchdog log:
echo   type %TEMP%\loma_watchdog.log
echo.
pause
