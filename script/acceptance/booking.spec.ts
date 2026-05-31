// BOOK — booking creation + conflict prevention. See test plan §7.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  apiUp,
  serviceByCode,
  slotAtLeastHoursAhead,
  createBooking,
  cancel,
  sampleCustomer,
} from './helpers/api';
import { CODE_RE } from './helpers/fixtures';

const created: Array<{ code: string; contact: string }> = [];

describe.runIf(apiUp())('BOOK — create + conflict', () => {
  let serviceId: string;

  beforeAll(async () => {
    serviceId = (await serviceByCode('B2'))?.id;
  });

  afterAll(async () => {
    // Best-effort cleanup (>12h slots are cancellable). A disposable test DB /
    // Neon branch reset is the real reset; see README.
    for (const b of created) {
      try {
        await cancel(b.code);
      } catch {
        /* ignore */
      }
    }
  });

  it('BOOK-01 valid booking → 201 with confirmed status + code @smoke', async () => {
    const slot = await slotAtLeastHoursAhead(serviceId);
    expect(slot, 'need a bookable slot ≥48h ahead').toBeTruthy();
    const cust = sampleCustomer();
    const r = await createBooking({ serviceId, startAt: slot.startAt, ...cust });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('confirmed');
    expect(r.body.confirmationCode).toMatch(CODE_RE);
    created.push({ code: r.body.confirmationCode, contact: cust.customerEmail });
  });

  it('BOOK-03 missing required contact field → 400', async () => {
    const slot = await slotAtLeastHoursAhead(serviceId);
    const base = { serviceId, startAt: slot.startAt, ...sampleCustomer() };
    for (const field of ['customerName', 'customerPhone', 'customerEmail']) {
      const payload: any = { ...base };
      delete payload[field];
      const r = await createBooking(payload);
      expect(r.status, `omitting ${field}`).toBe(400);
    }
  });

  it('BOOK-04 invalid email → 400', async () => {
    const slot = await slotAtLeastHoursAhead(serviceId);
    const r = await createBooking({ serviceId, startAt: slot.startAt, ...sampleCustomer({ customerEmail: 'not-an-email' }) });
    expect(r.status).toBe(400);
  });

  it('BOOK-05 double-booking the same slot → 409 @smoke', async () => {
    const slot = await slotAtLeastHoursAhead(serviceId);
    const cust = sampleCustomer();
    const first = await createBooking({ serviceId, startAt: slot.startAt, ...cust });
    expect(first.status).toBe(201);
    created.push({ code: first.body.confirmationCode, contact: cust.customerEmail });

    const second = await createBooking({ serviceId, startAt: slot.startAt, ...sampleCustomer() });
    expect(second.status).toBe(409);
  });

  it('BOOK-10 concurrent requests for one slot → exactly one 201, one 409 @smoke', async () => {
    const slot = await slotAtLeastHoursAhead(serviceId);
    const a = sampleCustomer();
    const b = sampleCustomer();
    const [r1, r2] = await Promise.all([
      createBooking({ serviceId, startAt: slot.startAt, ...a }),
      createBooking({ serviceId, startAt: slot.startAt, ...b }),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 409]);
    const winner = r1.status === 201 ? { r: r1, c: a } : { r: r2, c: b };
    created.push({ code: winner.r.body.confirmationCode, contact: winner.c.customerEmail });
  });

  it('BOOK-09 a booked slot disappears from availability', async () => {
    const slot = await slotAtLeastHoursAhead(serviceId);
    const cust = sampleCustomer();
    const r = await createBooking({ serviceId, startAt: slot.startAt, ...cust });
    expect(r.status).toBe(201);
    created.push({ code: r.body.confirmationCode, contact: cust.customerEmail });

    const next = await slotAtLeastHoursAhead(serviceId);
    expect(next?.startAt).not.toBe(slot.startAt);
  });
});

describe('BOOK — pending (DB-level assertions)', () => {
  it.todo('BOOK-02 occupied_until = end+30; source=online; payment_status=pay_in_person');
  it.todo('BOOK-06 start < now+1h / > 7d / outside hours → rejected (status code per SPEC-CONFIRM-1)');
  it.todo('BOOK-11 EXCLUDE gist constraint present (needs btree_gist) — verified via migration test');
});
