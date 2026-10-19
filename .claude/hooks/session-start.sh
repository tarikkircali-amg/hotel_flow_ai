#!/bin/bash
# ============================================================
# Mizos Holding AI — SessionStart hook (hotel_flow_ai)
# Bagimliliklari kurar ve /api/health smoke testi yapar.
# Senkron mod: oturum baslamadan once bagimliliklar hazir olur.
# Idempotent ve non-interactive.
# ============================================================
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

echo "[session-start] npm install..."
npm install --no-audit --no-fund

# --- Non-fatal saglik smoke testi ---
# Sunucuyu kisa sure ayaga kaldir, /api/health'i dogrula, kapat.
# Basarisiz olsa bile oturumu DUSURME (|| true), sadece uyar.
echo "[session-start] saglik kontrolu (/api/health)..."
(
  PORT="${PORT:-3000}"
  node server.js >/tmp/hotelflow-health.log 2>&1 &
  SRV_PID=$!
  # Sunucunun acilmasini bekle (en fazla ~10sn)
  for i in $(seq 1 20); do
    if curl -fsS "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
      echo "[session-start] ✅ /api/health yanit verdi."
      break
    fi
    sleep 0.5
  done
  if ! curl -fsS "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
    echo "[session-start] ‼️  /api/health yanit vermedi (non-fatal). Log: /tmp/hotelflow-health.log"
  fi
  kill "$SRV_PID" >/dev/null 2>&1 || true
  wait "$SRV_PID" 2>/dev/null || true
) || true

echo "[session-start] tamam."
