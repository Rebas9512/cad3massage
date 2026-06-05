// LEAD — minimum-advance (1-hour notice) policy + staff walk-in (noLead) override.
// Covers the 2026-06 change: staff can drop the 1-hour lead time to see + book
// near-term slots, while the public path ALWAYS enforces it (TOO_SOON). See test
// plan §6/§11.
//
// Lead time is relative to *now*, so these tests inspect the live clock rather
// than booking far-future days. The superset check (LEAD-01) is always valid;
// the SEC check (LEAD-02) only runs when the studio is actually open within the
// next hour (otherwise there is no near-term slot to reveal) and self-skips.
import { describe, it, expect, beforeAll } from 'vitest';
import {
  apiUp,
  serviceByCode,
  availability,
  createBooking,
  sampleCustomer,
} from './helpers/api';
import { RULES } from './helpers/fixtures';

const SVC = 'A1'; // Chair · 15 min — shortest, most likely to fit inside the next hour
const LEAD_MS = RULES.minAdvanceMinutes * 60_000;

const allSlots = (body: any): number[] =>
  (body?.days ?? []).flatMap((d: any) =>
    (d.therapists ?? []).flatMap((t: any) => (t.slots ?? []).map((s: any) => new Date(s.startAt).getTime())),
  );

describe.runIf(apiUp())('LEAD — minimum advance + walk-in', () => {
  let serviceId: string;

  beforeAll(async () => {
    serviceId = (await serviceByCode(SVC))?.id;
  });

  it('LEAD-01 noLead availability is a superset of default availability (never removes slots)', async () => {
    const def = await availability(serviceId, 30);
    const nob = await availability(serviceId, 30, { noLead: true });
    const nobSet = new Set(allSlots(nob.body));
    const defSlots = allSlots(def.body);
    expect(defSlots.length).toBeGreaterThan(0);
    for (const ms of defSlots) expect(nobSet.has(ms), `default slot ${new Date(ms).toISOString()} missing from noLead set`).toBe(true);
  });

  it('LEAD-02 (SEC) noLead reveals sub-1h slots, but the public POST rejects them with TOO_SOON', async () => {
    const now = Date.now();
    const nob = await availability(serviceId, 1, { noLead: true });
    const def = await availability(serviceId, 1);
    // Earliest near-term slot the override reveals: in the future but inside the lead window.
    const nearTerm = allSlots(nob.body).filter((ms) => ms > now && ms < now + LEAD_MS).sort((a, b) => a - b)[0];

    // No near-term slot exists right now (closed, or within an hour of close) → nothing to assert.
    if (nearTerm === undefined) return;

    // Default availability must NOT offer it — the 1-hour rule hides it for guests.
    expect(allSlots(def.body).includes(nearTerm), 'default availability must hide the sub-1h slot').toBe(false);

    // And a public booking of that exact time is refused as too soon (no row created).
    const r = await createBooking({ serviceId, startAt: new Date(nearTerm).toISOString(), ...sampleCustomer() });
    expect(r.status, 'public booking within the lead window must be rejected').toBe(400);
    expect(r.body?.error?.code).toBe('TOO_SOON');
  });
});
