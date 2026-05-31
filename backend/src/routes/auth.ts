import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { eq } from 'drizzle-orm';
import { loginSchema } from '@cad3/shared';
import { db } from '#db';
import { staffMember } from '../db/schema.ts';
import { verifyPassword } from '../lib/password.ts';
import { apiError } from '../lib/errors.ts';
import { authGuard } from '../middleware/auth.ts';
import { ENV } from '../env.ts';

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export const auth = new Hono();

auth.post('/login', async (c) => {
  const parsed = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(apiError('BAD_REQUEST', 'Invalid login'), 400);
  const u = (await db.select().from(staffMember).where(eq(staffMember.email, parsed.data.email.toLowerCase())))[0];
  if (!u || !u.isActive || !(await verifyPassword(parsed.data.password, u.passwordHash))) {
    return c.json(apiError('UNAUTHORIZED', 'Invalid email or password'), 401);
  }
  const now = Math.floor(Date.now() / 1000);
  // Device-persistent login: once a (private staff) device signs in it stays
  // signed in until a manual logout — so the access token is effectively
  // non-expiring (10y). Single-staff MVP tradeoff; see Staff Console spec.
  const accessToken = await sign({ sub: u.id, role: u.role, exp: now + TEN_YEARS }, ENV.JWT_SECRET, 'HS256');
  const refreshToken = await sign({ sub: u.id, type: 'refresh', exp: now + TEN_YEARS }, ENV.JWT_SECRET, 'HS256');
  return c.json({ accessToken, refreshToken, staff: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

auth.post('/refresh', async (c) => {
  const { refreshToken } = (await c.req.json().catch(() => ({}))) as { refreshToken?: string };
  if (!refreshToken) return c.json(apiError('BAD_REQUEST', 'Missing refreshToken'), 400);
  try {
    const payload = await verify(refreshToken, ENV.JWT_SECRET, 'HS256');
    // Must be an actual refresh token (not a re-used access token).
    if (payload.type !== 'refresh' || typeof payload.sub !== 'string') {
      return c.json(apiError('UNAUTHORIZED', 'Invalid refresh token'), 401);
    }
    // Re-check the account on every refresh and read role fresh from the DB
    // (the refresh token carries no role, and the account may be deactivated).
    const u = (await db.select().from(staffMember).where(eq(staffMember.id, payload.sub)))[0];
    if (!u || !u.isActive) return c.json(apiError('UNAUTHORIZED', 'Account is no longer active'), 401);
    const now = Math.floor(Date.now() / 1000);
    const accessToken = await sign({ sub: u.id, role: u.role, exp: now + TEN_YEARS }, ENV.JWT_SECRET, 'HS256');
    return c.json({ accessToken });
  } catch {
    return c.json(apiError('UNAUTHORIZED', 'Invalid refresh token'), 401);
  }
});

auth.get('/me', authGuard, async (c) => {
  const u = c.get('staff');
  return c.json({ staff: { id: u.id, name: u.name, email: u.email, role: u.role } });
});

auth.post('/logout', (c) => c.body(null, 204));
