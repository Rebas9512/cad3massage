import type { MiddlewareHandler } from 'hono';
import { jwt } from 'hono/jwt';
import { eq } from 'drizzle-orm';
import { db } from '#db';
import { staffMember } from '../db/schema.ts';
import { apiError } from '../lib/errors.ts';
import { ENV } from '../env.ts';

type StaffRow = typeof staffMember.$inferSelect;

// Make the authenticated staff row available to handlers via c.get('staff').
declare module 'hono' {
  interface ContextVariableMap {
    staff: StaffRow;
  }
}

const verifyJwt = jwt({ secret: ENV.JWT_SECRET, alg: 'HS256' });

// Guard for staff-only routes: valid JWT signature AND the account still exists
// and is active. Tokens are long-lived (device-persistent login), so without the
// account re-check a deactivated staff member would keep full access for the life
// of the token. Stashes the fresh row on context for handlers that need it.
export const authGuard: MiddlewareHandler = async (c, next) => {
  // Throws HTTPException(401) on a missing/invalid token (handled by app.onError).
  await verifyJwt(c, async () => {});
  const payload = c.get('jwtPayload') as { sub?: string } | undefined;
  const id = payload?.sub;
  const u = id ? (await db.select().from(staffMember).where(eq(staffMember.id, id)))[0] : undefined;
  if (!u || !u.isActive) return c.json(apiError('UNAUTHORIZED', 'Account is no longer active'), 401);
  c.set('staff', u);
  await next();
};
