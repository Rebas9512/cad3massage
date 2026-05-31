// MANAGE — lookup + cancel. See test plan §8.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  apiUp,
  serviceByCode,
  slotAtLeastHoursAhead,
  createBooking,
  lookup,
  cancel,
  sampleCustomer,
} from './helpers/api';

const created: Array<{ code: string; contact: string }> = [];

async function freshBooking(serviceId: string) {
  const slot = await slotAtLeastHoursAhead(serviceId);
  const cust = sampleCustomer();
  const r = await createBooking({ serviceId, startAt: slot.startAt, ...cust });
  if (r.status === 201) created.push({ code: r.body.confirmationCode, contact: cust.customerEmail });
  return { r, cust, slot };
}

describe.runIf(apiUp())('MANAGE — lookup + cancel', () => {
  let serviceId: string;
  beforeAll(async () => {
    serviceId = (await serviceByCode('B2'))?.id;
  });
  afterAll(async () => {
    for (const b of created) {
      try {
        await cancel(b.code);
      } catch {
        /* ignore */
      }
    }
  });

  it('MANAGE-01 lookup by code only → 200 @smoke', async () => {
    const { r } = await freshBooking(serviceId);
    expect(r.status).toBe(201);
    const found = await lookup(r.body.confirmationCode);
    expect(found.status).toBe(200);
    expect(found.body.confirmationCode ?? found.body.booking?.confirmationCode).toBe(r.body.confirmationCode);
  });

  it('MANAGE-02 lookup with an unknown code → 404', async () => {
    const found = await lookup('CAD3-ZZZZZ');
    expect(found.status).toBe(404);
  });

  it('MANAGE-03 cancel before the 12h cutoff → cancelled @smoke', async () => {
    const { r } = await freshBooking(serviceId); // slot is ≥48h out → cancellable
    expect(r.status).toBe(201);
    const c = await cancel(r.body.confirmationCode);
    expect(c.status).toBe(200);
    expect(c.body.status ?? c.body.booking?.status).toBe('cancelled');
  });

  it('MANAGE-05 a cancelled slot becomes bookable again @smoke', async () => {
    const { r, slot } = await freshBooking(serviceId);
    expect(r.status).toBe(201);
    await cancel(r.body.confirmationCode);
    const reuse = await createBooking({ serviceId, startAt: slot.startAt, ...sampleCustomer() });
    expect(reuse.status).toBe(201);
    created.push({ code: reuse.body.confirmationCode, contact: 'n/a' });
  });
});

describe('MANAGE — pending', () => {
  it.todo('MANAGE-04 cancel within 12h → rejected with "call us" semantics (needs a <12h slot fixture)');
  it.todo('MANAGE-06 cancelling an already-cancelled booking is idempotent / friendly');
  it.todo('MANAGE-07 E2E: customer looks up + cancels in the browser');
});
