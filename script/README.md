# CAD3 Massage — Acceptance & Regression Harness

Black-box acceptance tests (Vitest) that hit the API over HTTP. The executable
mirror of the vault doc **`06 - Testing/Acceptance & Regression Test Plan`** —
each test references a stable case ID (e.g. `BOOK-05`, `AVAIL-06`).

## Run

```bash
cd script
npm install
npm test            # full suite
npm run test:smoke  # critical path only (titles tagged @smoke)
npm run test:watch
```

Point it at any environment (use `API_BASE_URL` — **not** `BASE_URL`, which
Vitest reserves for its base path):

```bash
API_BASE_URL=http://127.0.0.1:8787 npm test      # wrangler dev (default)
API_BASE_URL=https://api.cad3massage.com npm test
```

Copy `.env.example` → `.env` to set `API_BASE_URL` and optional `STAFF_EMAIL` /
`STAFF_PASSWORD` (unlocks `AUTH-02b` and, later, `STAFF-*`). Vitest does not
auto-load `.env`; pass vars inline or `export` them (or `node --env-file=.env`).

## How it behaves before the backend exists

`acceptance/setup.ts` probes `GET /health` once. **If the API is unreachable,
every API suite is SKIPPED** (not failed) and a banner explains why — so the
harness is runnable today and lights up case-by-case as endpoints land.

## Layout

```
acceptance/
  setup.ts              # health probe → sets apiUp() gate
  helpers/api.ts        # fetch wrapper + domain helpers (services, availability, booking…)
  helpers/fixtures.ts   # expected seed (14 services, hours, rules) — keep in sync with seed script
  *.spec.ts             # one file per domain: menu, therapists, availability, booking,
                        # manage, notify, auth, staff, security
```

`it.todo(...)` marks cases that need state the public API can't set up
black-box (engine unit cases with an injected clock, email/inbox checks, DB
constraint checks). Those become real tests inside `apps/api` (Vitest) and
`apps/web` (Playwright) during the build — same case IDs.

## Test-data reset

Mutating tests (`BOOK-*`, `MANAGE-*`) create bookings ≥48h out and cancel them
in `afterAll` (best-effort). For clean repeatable runs, point `API_BASE_URL` at a
**disposable API backed by a throwaway Neon dev branch / local Postgres** that
is reset before the run — don't run the mutating suite against production.

## Status

Code not built yet → suites currently SKIP. Tracking: vault `06 - Testing`.
