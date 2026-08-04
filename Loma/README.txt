━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  LOMA — STARTUP GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EASIEST: Just double-click "START LOMA.bat"
It starts everything automatically.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MANUAL COMMANDS (if batch file fails)
  Run each in a separate terminal window
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — Start Ollama (skip if already running)
  ollama serve

STEP 2 — Start PM2 servers
  pm2 resurrect
  pm2 restart loma-proxy
  pm2 restart frontend

STEP 3 — Start Cloudflare tunnel
  cloudflared tunnel run

STEP 4 — Open in browser
  https://envizion.work

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PORTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  8080  — Frontend (index.html)
  8081  — API proxy (server.js → Ollama)
  11434 — Ollama
  3000  — OLD port (nothing should use this)

  Cloudflare tunnel config:
  C:\Users\youse\.cloudflared\config.yml

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  IF YOU GET "port already in use" ON 8081
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  netstat -ano | findstr :8081
  taskkill /PID <the number on the right> /F
  pm2 restart loma-proxy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
