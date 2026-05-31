// THER — therapists (public). See test plan §5.
import { describe, it, expect } from 'vitest';
import { GET, apiUp } from './helpers/api';

describe.runIf(apiUp())('THER — therapists (public)', () => {
  it('THER-01 returns active therapists only; never leaks credentials', async () => {
    const r = await GET('/therapists');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect((r.body as any[]).length).toBeGreaterThanOrEqual(1);
    for (const t of r.body as any[]) {
      expect(t).toHaveProperty('name');
      expect(t).not.toHaveProperty('email');
      expect(t).not.toHaveProperty('password_hash');
      expect(t).not.toHaveProperty('passwordHash');
    }
  });

  it('THER-02 availability works without therapistId (single-therapist default)', async () => {
    const svc = await (await GET('/services')).body?.[0];
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const r = await GET(`/availability?serviceId=${svc.id}&from=${from}&to=${to}`);
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty('days');
  });
});
