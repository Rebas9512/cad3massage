import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { apiError } from './lib/errors.ts';
import { ENV } from './env.ts';
import { rateLimit } from './middleware/rateLimit.ts';
import { services } from './routes/services.ts';
import { therapists } from './routes/therapists.ts';
import { availabilityRoute } from './routes/availability.ts';
import { bookings } from './routes/bookings.ts';
import { auth } from './routes/auth.ts';
import { staff } from './routes/staff.ts';

export const app = new Hono();

// CORS: restrict to the configured origins in prod; reflect any origin when the
// allowlist is empty (local dev). Tokens live in localStorage (not cookies), so
// credentials are off — JS must explicitly attach the Authorization header.
app.use('*', cors({
  origin: ENV.ALLOWED_ORIGINS.length ? ENV.ALLOWED_ORIGINS : (origin) => origin ?? '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
app.get('/health', (c) => c.json({ ok: true, service: 'cad3-api' }));

// Rate limits (engage only behind the CF proxy — see middleware/rateLimit.ts).
// Brute-force guard on login (per IP).
app.use('/api/auth/login', rateLimit({ prefix: 'login', windowMs: 15 * 60_000, max: 20 }));
// Throttle confirmation-code enumeration (lookup/cancel are code-only).
app.use('/api/bookings/lookup', rateLimit({ prefix: 'lookup', windowMs: 60_000, max: 30 }));
app.use('/api/bookings/*', rateLimit({ prefix: 'bk-mutate', windowMs: 60_000, max: 30 }));
// Throttle public booking spam (calendar flooding).
app.post('/api/bookings', rateLimit({ prefix: 'book', windowMs: 10 * 60_000, max: 30 }));

app.route('/api/services', services);
app.route('/api/therapists', therapists);
app.route('/api/availability', availabilityRoute);
app.route('/api/bookings', bookings);
app.route('/api/auth', auth);
app.route('/api/staff', staff);

app.notFound((c) => c.json(apiError('NOT_FOUND', 'Not found'), 404));
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    if (err.status === 401) return c.json(apiError('UNAUTHORIZED', 'Authentication required'), 401);
    return err.getResponse();
  }
  console.error('[api error]', err);
  return c.json(apiError('INTERNAL', 'Internal server error'), 500);
});
