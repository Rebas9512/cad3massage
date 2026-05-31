import { config } from 'dotenv';
import { resolve } from 'node:path';

// Root .env (one level up from backend/) then fallbacks. First load wins.
config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '../../.env') });
config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const DEV_JWT_SECRET = 'dev-only-change-me';
const jwtSecret = process.env.JWT_SECRET ?? DEV_JWT_SECRET;
// Comma-separated allowlist for browser CORS. Empty → reflect any origin (dev).
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (jwtSecret === DEV_JWT_SECRET) {
  // Never let a deployed instance silently run on the well-known dev secret —
  // anyone could then forge valid staff tokens. On Cloudflare Workers NODE_ENV is
  // unset, so we also treat "a real CORS allowlist is configured" (prod domains in
  // wrangler.toml) as a deployed signal and fail closed rather than warn.
  if (process.env.NODE_ENV === 'production' || allowedOrigins.length > 0) {
    throw new Error('JWT_SECRET must be set to a strong, secret value before deploying (refusing to run on the public dev default).');
  }
  console.warn('⚠ JWT_SECRET is the insecure dev default — set a strong secret before deploying.');
}

export const ENV = {
  DATABASE_URL: required('DATABASE_URL'),
  API_PORT: Number(process.env.API_PORT ?? 8787),
  STUDIO_TZ: process.env.STUDIO_TZ ?? 'America/Chicago',
  JWT_SECRET: jwtSecret,
  STAFF_EMAIL: process.env.STAFF_EMAIL ?? 'staff@example.com',
  STAFF_PASSWORD: process.env.STAFF_PASSWORD ?? 'change-me',
  ALLOWED_ORIGINS: allowedOrigins,

  // --- Email (Resend) ---
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  EMAIL_FROM: process.env.EMAIL_FROM ?? 'CAD3 Massage <noreply@cad3massage.com>',
  STAFF_NOTIFY_EMAIL: process.env.STAFF_NOTIFY_EMAIL ?? '',
  APP_BASE_URL: (process.env.APP_BASE_URL ?? 'http://127.0.0.1:5173').replace(/\/$/, ''),
  // Real sends require an explicit opt-in AND a key. Default off → console provider
  // (safe for local dev / tests: nothing actually leaves the machine).
  EMAIL_ENABLED: process.env.EMAIL_ENABLED === 'true' && !!process.env.RESEND_API_KEY,

  // --- WeChat staff push (PushPlus) ---
  // Secondary staff-alert channel. Same opt-in pattern: real push only when
  // WECHAT_ENABLED and a token are set, else console.
  PUSHPLUS_TOKEN: process.env.PUSHPLUS_TOKEN ?? '',
  WECHAT_ENABLED: process.env.WECHAT_ENABLED === 'true' && !!process.env.PUSHPLUS_TOKEN,
};

if (process.env.EMAIL_ENABLED === 'true' && !process.env.RESEND_API_KEY) {
  console.warn('⚠ EMAIL_ENABLED=true but RESEND_API_KEY is missing — falling back to console (no real email sent).');
}
if (ENV.EMAIL_ENABLED && !ENV.STAFF_NOTIFY_EMAIL) {
  console.warn('⚠ STAFF_NOTIFY_EMAIL is unset — staff alerts (new / cancelled bookings) will be silently skipped.');
}
if (process.env.WECHAT_ENABLED === 'true' && !process.env.PUSHPLUS_TOKEN) {
  console.warn('⚠ WECHAT_ENABLED=true but PUSHPLUS_TOKEN is missing — falling back to console (no real WeChat push).');
}
