// BUFFER — post-session buffer policy + staff back-to-back (noBuffer) override.
// Covers the 2026-06 change: staff can drop the 30-min buffer to book flush
// (back-to-back), while the public path ALWAYS enforces it. See test plan §7/§11.
//
// Single therapist ⇒ one shared timeline, and other spec files book the EARLIEST
// slots. To avoid cross-file contention every test here books on a distinct
// far-future (≥18 days) empty day via farDayslots(offset).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  apiUp,
  serviceByCode,
  availability,
  hasSlotAt,
  createBooking,
  cancel,
  sampleCustomer,
  login,
  staffCreate,
  patchBooking,
  staffBookingByCode,
  farDayslots,
} from './helpers/api';
import { CODE_RE, RULES } from './helpers/fixtures';

const SVC = 'A3'; // Chair · 30 min — short, so T+D and T+D+buffer stay well inside hours
const BUF_MS = RULES.bufferMinutes * 60_000;
const MIN = 60_000;
const iso = (ms: number) => new Date(ms).toISOString();

const created: string[] = []; // confirmation codes to clean up

describe.runIf(apiUp())('BUFFER — policy + back-to-back', () => {
  let serviceId: string;
  let durMs: number;
  let token: string | null = null;

  beforeAll(async () => {
    const svc = await serviceByCode(SVC);
    serviceId = svc?.id;
    durMs = (svc?.durationMinutes ?? 30) * MIN;
    const r = await login();
    if (r?.status === 200) token = r.body.accessToken;
  });

  afterAll(async () => {
    for (const code of created) {
      try { await cancel(code); } catch { /* ignore */ }
    }
  });

  // ---- public path: buffer always enforced --------------------------------

  it('BUF-01 a public booking reserves exactly the 30-min buffer after it @smoke', async () => {
    const day = await farDayslots(serviceId, 18);
    expect(day, 'need a far-future open day').toBeTruthy();
    const T = new Date(day!.slots[0].startAt).getTime();

    const cust = sampleCustomer();
    const r = await createBooking({ serviceId, startAt: iso(T), ...cust });
    expect(r.status).toBe(201);
    created.push(r.body.confirmationCode);

    const after = await availability(serviceId, 30);
    // Flush slot (right at the booking's service end) is blocked by the buffer…
    expect(hasSlotAt(after.body, T + durMs), 'flush slot must be blocked by buffer').toBe(false);
    // …and the next slot one buffer later is open again.
    expect(hasSlotAt(after.body, T + durMs + BUF_MS), 'slot after the buffer must reopen').toBe(true);
  });

  it('BUF-02 (SEC) public POST ignores a client-supplied noBuffer — buffer still reserved', async () => {
    const day = await farDayslots(serviceId, 19);
    expect(day).toBeTruthy();
    const T = new Date(day!.slots[0].startAt).getTime();

    // A customer cannot opt out of the buffer: the field is not in the public
    // schema and is stripped, so occupancy still includes the 30-min buffer.
    const r = await createBooking({ serviceId, startAt: iso(T), noBuffer: true, ...sampleCustomer() });
    expect(r.status).toBe(201);
    created.push(r.body.confirmationCode);

    const after = await availability(serviceId, 30);
    expect(hasSlotAt(after.body, T + durMs), 'public noBuffer must NOT take effect').toBe(false);
  });

  it('BUF-03 noBuffer availability is a superset of default availability (never removes slots)', async () => {
    const def = await availability(serviceId, 30);
    const nob = await availability(serviceId, 30, { noBuffer: true });
    const nobSet = new Set(
      (nob.body.days ?? []).flatMap((d: any) => (d.therapists ?? []).flatMap((t: any) => (t.slots ?? []).map((s: any) => new Date(s.startAt).getTime()))),
    );
    const defSlots = (def.body.days ?? []).flatMap((d: any) => (d.therapists ?? []).flatMap((t: any) => (t.slots ?? []).map((s: any) => new Date(s.startAt).getTime())));
    expect(defSlots.length).toBeGreaterThan(0);
    for (const ms of defSlots) expect(nobSet.has(ms), `default slot ${iso(ms)} missing from noBuffer set`).toBe(true);
  });

  it('BUF-04 noBuffer availability reveals the flush-before slot that the buffer hides', async () => {
    const day = await farDayslots(serviceId, 20);
    expect(day).toBeTruthy();
    const T0 = new Date(day!.slots[0].startAt).getTime(); // day open
    const U = T0 + durMs; // book the *second* session here so T0 sits flush before it

    const r = await createBooking({ serviceId, startAt: iso(U), ...sampleCustomer() });
    expect(r.status).toBe(201);
    created.push(r.body.confirmationCode);

    const def = await availability(serviceId, 30);
    const nob = await availability(serviceId, 30, { noBuffer: true });
    // With the buffer, a session ending exactly at U is rejected (its trailing
    // buffer would overlap U); without it, the flush-before slot is offered.
    expect(hasSlotAt(def.body, T0), 'buffer should hide the flush-before slot').toBe(false);
    expect(hasSlotAt(nob.body, T0), 'noBuffer should reveal the flush-before slot').toBe(true);
  });

  // ---- staff path: noBuffer override (needs auth) -------------------------

  it('BUF-10 staff noBuffer booking has occupied_until == end_at (no trailing buffer)', async (ctx) => {
    if (!token) return ctx.skip();
    const day = await farDayslots(serviceId, 21);
    expect(day).toBeTruthy();
    const T = new Date(day!.slots[0].startAt).getTime();

    const r = await staffCreate(token, { serviceId, startAt: iso(T), customerName: 'Buf NoBuf', noBuffer: true });
    expect(r.status).toBe(201);
    expect(r.body.confirmationCode).toMatch(CODE_RE);
    created.push(r.body.confirmationCode);

    const row = await staffBookingByCode(token, r.body.confirmationCode);
    expect(row, 'booking must appear in staff schedule').toBeTruthy();
    expect(new Date(row.occupiedUntil).getTime()).toBe(new Date(row.endAt).getTime());
  });

  it('BUF-11 staff default booking has occupied_until == end_at + 30 min', async (ctx) => {
    if (!token) return ctx.skip();
    const day = await farDayslots(serviceId, 22);
    expect(day).toBeTruthy();
    const T = new Date(day!.slots[0].startAt).getTime();

    const r = await staffCreate(token, { serviceId, startAt: iso(T), customerName: 'Buf Default' });
    expect(r.status).toBe(201);
    created.push(r.body.confirmationCode);

    const row = await staffBookingByCode(token, r.body.confirmationCode);
    expect(row).toBeTruthy();
    expect(new Date(row.occupiedUntil).getTime() - new Date(row.endAt).getTime()).toBe(BUF_MS);
  });

  it('BUF-12 two staff noBuffer bookings can sit back-to-back (flush, no 409) @smoke', async (ctx) => {
    if (!token) return ctx.skip();
    const day = await farDayslots(serviceId, 23);
    expect(day).toBeTruthy();
    const T = new Date(day!.slots[0].startAt).getTime();

    const first = await staffCreate(token, { serviceId, startAt: iso(T), customerName: 'B2B One', noBuffer: true });
    expect(first.status).toBe(201);
    created.push(first.body.confirmationCode);

    // Second session starts exactly when the first ends.
    const second = await staffCreate(token, { serviceId, startAt: iso(T + durMs), customerName: 'B2B Two', noBuffer: true });
    expect(second.status, 'back-to-back must be allowed in noBuffer mode').toBe(201);
    created.push(second.body.confirmationCode);

    expect(new Date(second.body.startAt).getTime()).toBe(new Date(first.body.endAt).getTime());
  });

  it('BUF-13 buffer is enforced for a default booking: a flush follower is rejected, +30 min is allowed', async (ctx) => {
    if (!token) return ctx.skip();
    const day = await farDayslots(serviceId, 24);
    expect(day).toBeTruthy();
    const T = new Date(day!.slots[0].startAt).getTime();

    const first = await staffCreate(token, { serviceId, startAt: iso(T), customerName: 'Buf Block' }); // default buffer
    expect(first.status).toBe(201);
    created.push(first.body.confirmationCode);

    // Flush follower overlaps the first booking's reserved buffer → 409.
    const flush = await staffCreate(token, { serviceId, startAt: iso(T + durMs), customerName: 'Flush', noBuffer: true });
    expect(flush.status, 'flush against a buffered booking must conflict').toBe(409);

    // One buffer later is clear → 201.
    const ok = await staffCreate(token, { serviceId, startAt: iso(T + durMs + BUF_MS), customerName: 'After Buffer', noBuffer: true });
    expect(ok.status).toBe(201);
    created.push(ok.body.confirmationCode);
  });

  it('BUF-14 the overlap constraint still holds in noBuffer mode (no double-book)', async (ctx) => {
    if (!token) return ctx.skip();
    const day = await farDayslots(serviceId, 25);
    expect(day).toBeTruthy();
    const T = new Date(day!.slots[0].startAt).getTime();

    const base = await staffCreate(token, { serviceId, startAt: iso(T), customerName: 'Overlap Base', noBuffer: true });
    expect(base.status).toBe(201);
    created.push(base.body.confirmationCode);

    // Exact same start → conflict.
    const dup = await staffCreate(token, { serviceId, startAt: iso(T), customerName: 'Dup', noBuffer: true });
    expect(dup.status, 'identical start must conflict').toBe(409);

    // Mid-session start (still inside the service time) → conflict.
    const mid = await staffCreate(token, { serviceId, startAt: iso(T + durMs / 2), customerName: 'Mid', noBuffer: true });
    expect(mid.status, 'overlapping the service time must conflict').toBe(409);
  });

  // ---- reschedule honors the buffer flag (parity with manual entry) -------

  it('BUF-20 reschedule with noBuffer drops the trailing buffer (occupied_until == end_at)', async (ctx) => {
    if (!token) return ctx.skip();
    const day = await farDayslots(serviceId, 26);
    expect(day).toBeTruthy();
    const T = new Date(day!.slots[0].startAt).getTime();

    const c = await staffCreate(token, { serviceId, startAt: iso(T), customerName: 'RS Default' }); // default buffer
    expect(c.status).toBe(201);
    created.push(c.body.confirmationCode);
    let row = await staffBookingByCode(token, c.body.confirmationCode);
    expect(new Date(row.occupiedUntil).getTime() - new Date(row.endAt).getTime()).toBe(BUF_MS);

    const r = await patchBooking(token, row.id, { startAt: iso(T), noBuffer: true });
    expect(r.status).toBe(200);
    row = await staffBookingByCode(token, c.body.confirmationCode);
    expect(new Date(row.occupiedUntil).getTime(), 'reschedule noBuffer ⇒ occupied_until == end_at').toBe(new Date(row.endAt).getTime());
  });

  it('BUF-21 reschedule without noBuffer restores the 30-min buffer', async (ctx) => {
    if (!token) return ctx.skip();
    const day = await farDayslots(serviceId, 27);
    expect(day).toBeTruthy();
    const T = new Date(day!.slots[0].startAt).getTime();

    const c = await staffCreate(token, { serviceId, startAt: iso(T), customerName: 'RS B2B', noBuffer: true });
    expect(c.status).toBe(201);
    created.push(c.body.confirmationCode);
    let row = await staffBookingByCode(token, c.body.confirmationCode);
    expect(new Date(row.occupiedUntil).getTime()).toBe(new Date(row.endAt).getTime());

    const r = await patchBooking(token, row.id, { startAt: iso(T), noBuffer: false });
    expect(r.status).toBe(200);
    row = await staffBookingByCode(token, c.body.confirmationCode);
    expect(new Date(row.occupiedUntil).getTime() - new Date(row.endAt).getTime(), 'reschedule w/o noBuffer ⇒ buffer restored').toBe(BUF_MS);
  });
});
