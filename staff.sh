#!/usr/bin/env bash
# CAD3 Massage — bring up the full stack and open the Staff console (/staff).
#   ./staff.sh           start DB + API + Web, open /staff
#   ./staff.sh --reset   wipe & reseed the database first, then open /staff
# Login uses the seeded STAFF_EMAIL / STAFF_PASSWORD from .env.
set -euo pipefail
cd "$(dirname "$0")"
OPEN_PATH=/staff exec ./dev.sh "$@"
