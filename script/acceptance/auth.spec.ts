// AUTH — staff auth (deferred impl; contract verified early). See test plan §10.
import { describe, it, expect } from 'vitest';
import { GET, POST, apiUp, login } from './helpers/api';

describe.runIf(apiUp())('AUTH — guards + login', () => {
  it('AUTH-01 staff endpoints require a valid JWT → 401 @smoke', async () => {
    const a = await GET('/staff/bookings');
    expect(a.status).toBe(401);
    const b = await GET('/auth/me');
    expect(b.status).toBe(401);
  });

  it('AUTH-02 login with wrong credentials → 401', async () => {
    const r = await POST('/auth/login', { email: 'nobody@example.com', password: 'wrong-password' });
    expect(r.status).toBe(401);
  });

  it('AUTH-02b login with seed credentials → tokens (skips unless STAFF_EMAIL/PASSWORD set)', async () => {
    const r = await login();
    if (!r) {
      // No seed creds provided — treat as not-applicable rather than fail.
      return;
    }
    expect(r.status).toBe(200);
    expect(r.body.accessToken).toBeTruthy();
    expect(r.body.refreshToken).toBeTruthy();
  });
});

describe('AUTH — pending', () => {
  it.todo('AUTH-03 PBKDF2 hash verify; plaintext never stored; refresh→new access');
  it.todo('AUTH-04 seed staff account can log in (seed-script test)');
});
