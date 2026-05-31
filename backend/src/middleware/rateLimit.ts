// Lightweight, dependency-free fixed-window rate limiter (defense-in-depth).
//
// Production note: the primary control is Cloudflare Rate Limiting / KV at the
// edge (see Architecture docs). This app-level limiter is a backstop and, on
// Workers, is per-isolate (best-effort). It only engages when a real client IP
// is present (cf-connecting-ip / x-forwarded-for) — i.e. behind the CF proxy —
// so local dev and the acceptance harness (loopback, no such header) are never
// throttled. Set RATE_LIMIT_FORCE=1 to exercise it locally.
import type { Context, MiddlewareHandler } from 'hono';
import { apiError } from '../lib/errors.ts';

const FORCE = process.env.RATE_LIMIT_FORCE === '1';

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();
let lastSweep = 0;

/** Real client IP from edge headers, or null when running locally (no proxy). */
function clientIp(c: Context): string | null {
  const cf = c.req.header('cf-connecting-ip');
  if (cf) return cf.trim();
  const xff = c.req.header('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return null;
}

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
}

export interface RateLimitOpts {
  windowMs: number;
  max: number;
  prefix: string;
  /** Extra key material beyond the IP (e.g. login email) to scope the bucket. */
  keyFn?: (c: Context) => string;
}

export function rateLimit(opts: RateLimitOpts): MiddlewareHandler {
  return async (c, next) => {
    const ip = clientIp(c);
    // No client IP → local/dev/test (or a misconfigured deploy). Skip unless forced.
    if (ip === null && !FORCE) return next();
    const now = Date.now();
    sweep(now);
    const key = `${opts.prefix}:${ip ?? 'local'}:${opts.keyFn ? opts.keyFn(c) : ''}`;
    let b = store.get(key);
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + opts.windowMs };
      store.set(key, b);
    }
    b.count++;
    if (b.count > opts.max) {
      c.header('Retry-After', String(Math.ceil((b.resetAt - now) / 1000)));
      return c.json(apiError('RATE_LIMITED', 'Too many requests. Please slow down and try again shortly.'), 429);
    }
    return next();
  };
}
