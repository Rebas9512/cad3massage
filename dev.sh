#!/usr/bin/env bash
# CAD3 Massage — bring up the whole local stack with one command.
#   ./dev.sh            start DB + API + Web (seed only if empty)
#   ./dev.sh --reset    wipe & reseed the database first
set -euo pipefail
cd "$(dirname "$0")"

echo "▸ Starting Postgres (docker)…"
docker compose up -d db

echo "▸ Waiting for Postgres…"
for i in $(seq 1 40); do
  if docker exec cad3_db pg_isready -U cad3 -d cad3 >/dev/null 2>&1; then
    echo "  ready"; break
  fi
  sleep 1
  if [ "$i" -eq 40 ]; then echo "✗ Postgres did not become ready"; exit 1; fi
done

if [ ! -d node_modules ]; then
  echo "▸ Installing dependencies…"
  npm install
fi

echo "▸ Running migrations…"
npm run migrate --silent

COUNT=$(docker exec cad3_db psql -U cad3 -d cad3 -tAc "select count(*) from service" 2>/dev/null | tr -d '[:space:]' || echo 0)
if [ "${1:-}" = "--reset" ] || [ -z "$COUNT" ] || [ "$COUNT" = "0" ]; then
  echo "▸ Seeding database…"
  npm run seed --silent
else
  echo "▸ Skipping seed ($COUNT services present; run ./dev.sh --reset to wipe & reseed)"
fi

echo ""
echo "✓ API  → http://127.0.0.1:8787"
echo "✓ Web  → http://127.0.0.1:5173        Staff → http://127.0.0.1:5173/staff"
echo "  Staff login: anna@cad3massage.com / changeme123      (Ctrl-C to stop both)"
echo ""

WEB_URL="http://127.0.0.1:5173"
# OPEN_PATH lets a wrapper (e.g. staff.sh) open a specific route instead of "/".
OPEN_URL="${WEB_URL}${OPEN_PATH:-}"

# Pick a browser opener for this OS (skippable with NO_OPEN=1).
open_browser() {
  if [ -n "${NO_OPEN:-}" ]; then return; fi
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$OPEN_URL" >/dev/null 2>&1
  elif command -v open >/dev/null 2>&1; then open "$OPEN_URL" >/dev/null 2>&1
  elif command -v powershell.exe >/dev/null 2>&1; then powershell.exe -NoProfile -Command "Start-Process '$OPEN_URL'" >/dev/null 2>&1
  elif command -v wslview >/dev/null 2>&1; then wslview "$OPEN_URL" >/dev/null 2>&1
  else echo "  (no browser opener found — open $OPEN_URL manually)"; fi
}

# Wait for the web server, then open it — runs alongside the foreground servers.
(
  for _ in $(seq 1 40); do
    if curl -sf -o /dev/null "$WEB_URL" 2>/dev/null; then
      echo "▸ Opening $OPEN_URL in your browser…"
      open_browser
      break
    fi
    sleep 0.5
  done
) &

exec npm run dev
