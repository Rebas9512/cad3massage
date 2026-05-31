// AVAIL — availability engine. Black-box invariants here; precise worked
// examples live as unit tests in apps/api (injected clock). See test plan §6.
import { describe, it, expect, beforeAll } from 'vitest';
import { apiUp, serviceByCode, availability, flattenSlots, isoMinute } from './helpers/api';
import { GRID_MINUTES, RULES } from './helpers/fixtures';

describe.runIf(apiUp())('AVAIL — availability invariants (API)', () => {
  let serviceId: string;
  let slots: any[] = [];

  beforeAll(async () => {
    serviceId = (await serviceByCode('B2'))?.id;
    const r = await availability(serviceId);
    slots = flattenSlots(r.body);
  });

  it('AVAIL-12 response shape: days[].therapists[].slots[{startAt,endAt}]', async () => {
    const r = await availability(serviceId);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.days)).toBe(true);
    for (const s of flattenSlots(r.body)) {
      expect(typeof s.startAt).toBe('string');
      expect(typeof s.endAt).toBe('string');
      expect(new Date(s.endAt).getTime()).toBeGreaterThan(new Date(s.startAt).getTime());
    }
  });

  it('AVAIL-06 every slot starts ≥ now + 1h @smoke', () => {
    const floor = Date.now() + RULES.minAdvanceMinutes * 60_000 - 60_000; // 1min tolerance
    for (const s of slots) expect(new Date(s.startAt).getTime()).toBeGreaterThanOrEqual(floor);
  });

  it('AVAIL-07 every slot within (now, now + window]; none in the past', () => {
    const ceil = Date.now() + RULES.windowDays * 86_400_000 + 86_400_000; // window + 1d tolerance
    for (const s of slots) {
      const t = new Date(s.startAt).getTime();
      expect(t).toBeGreaterThan(Date.now() - 60_000);
      expect(t).toBeLessThanOrEqual(ceil);
    }
  });

  it('AVAIL-02 start times align to the 15-minute grid', () => {
    for (const s of slots) expect(GRID_MINUTES).toContain(isoMinute(s.startAt));
  });

  it('SEC-01 availability never exposes other customers’ data', () => {
    for (const s of slots) {
      expect(s).not.toHaveProperty('customerName');
      expect(s).not.toHaveProperty('customerEmail');
      expect(s).not.toHaveProperty('customerPhone');
    }
  });
});

describe('AVAIL — engine unit (apps/api, injected clock + seeded state)', () => {
  it.todo('AVAIL-01 Mon B2 empty → first 10:00, last 21:00');
  it.todo('AVAIL-03 existing 13:00 booking blocks overlap incl buffer; AM ends 11:30, PM resumes 14:30');
  it.todo('AVAIL-04 occupancy is [start, end+30) half-open');
  it.todo('AVAIL-05 per-day close boundaries (Sun 20:00 / Sat 22:00)');
  it.todo('AVAIL-08 TimeOff removes its segment and blocks crossing bookings');
  it.todo('AVAIL-09 B5 (120m) on Sun: last start 18:00');
  it.todo('AVAIL-10 DST changeover day: correct local times, no missing/duplicate hour');
  it.todo('AVAIL-11 fully booked / day off → empty days, no error');
  it.todo('AVAIL-13 last booking buffer may extend past close');
});
