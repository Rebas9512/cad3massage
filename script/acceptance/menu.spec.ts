// MENU — services / full menu (public). See test plan §4.
import { describe, it, expect } from 'vitest';
import { GET, apiUp } from './helpers/api';
import { ACTIVE_SERVICES, INACTIVE_CODES, CATEGORY_COUNTS } from './helpers/fixtures';

describe.runIf(apiUp())('MENU — services (public)', () => {
  it('MENU-01 returns exactly the 14 active services; no B4/H1 @smoke', async () => {
    const r = await GET('/services');
    expect(r.status).toBe(200);
    const codes = (r.body as any[]).map((s) => s.code).sort();
    expect(codes).toEqual(ACTIVE_SERVICES.map((s) => s.code).sort());
    expect(r.body).toHaveLength(14);
    for (const c of INACTIVE_CODES) expect(codes).not.toContain(c);
  });

  it('MENU-02 contract fields present; prices integer cents in USD', async () => {
    const r = await GET('/services');
    for (const s of r.body as any[]) {
      expect(s.currency).toBe('USD');
      expect(typeof s.code).toBe('string');
      expect(Number.isInteger(s.priceCents)).toBe(true);
      expect(Number.isInteger(s.durationMinutes)).toBe(true);
    }
    for (const exp of ACTIVE_SERVICES) {
      const got = (r.body as any[]).find((s) => s.code === exp.code);
      expect(got, `service ${exp.code}`).toBeTruthy();
      expect(got.priceCents).toBe(exp.priceCents);
      expect(got.durationMinutes).toBe(exp.durationMinutes);
      expect(got.category).toBe(exp.category);
    }
  });

  it('MENU-03 category counts Chair3 / Foot1 / Combo6 / Body4', async () => {
    const r = await GET('/services');
    const counts: Record<string, number> = {};
    for (const s of r.body as any[]) counts[s.category] = (counts[s.category] ?? 0) + 1;
    expect(counts).toMatchObject(CATEGORY_COUNTS);
  });
});

describe('MENU — pending (need UI render / DB toggle)', () => {
  it.todo('MENU-04 display name format "{Category} — {desc} ({dur})"');
  it.todo('MENU-05 Full Menu page: tiered prices + codes, no B4 (E2E)');
  it.todo('MENU-06 toggling B4 is_active=true yields 15 services');
});
