import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { createBookingSchema, lookupQuerySchema, RULES } from '@cad3/shared';
import { db } from '#db';
import { booking, service, staffMember } from '../db/schema.ts';
import { generateCode } from '../lib/code.ts';
import { apiError, pgCode, PG } from '../lib/errors.ts';
import { toBookingDTO } from '../lib/dto.ts';
import { isSlotOffered } from '../services/schedule.ts';
import { notifyBookingCreated, notifyBookingCancelled } from '../services/notify.ts';
import { runAfter } from '../lib/async.ts';

export const bookings = new Hono();

async function loadServiceAndTherapist(serviceId: string, therapistId: string) {
  const svc = (await db.select().from(service).where(eq(service.id, serviceId)))[0];
  const t = (await db.select().from(staffMember).where(eq(staffMember.id, therapistId)))[0];
  return { svc, t };
}

bookings.post('/', async (c) => {
  const parsed = createBookingSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(apiError('BAD_REQUEST', 'Invalid booking', parsed.error.flatten()), 400);
  const d = parsed.data;

  const svc = (await db.select().from(service).where(eq(service.id, d.serviceId)))[0];
  if (!svc || !svc.isActive) return c.json(apiError('BAD_REQUEST', 'Unknown service'), 400);

  const therapist = d.therapistId
    ? (await db.select().from(staffMember).where(and(eq(staffMember.id, d.therapistId), eq(staffMember.isActive, true))))[0]
    : (await db.select().from(staffMember).where(eq(staffMember.isActive, true)))[0];
  if (!therapist) return c.json(apiError('BAD_REQUEST', 'No therapist available'), 400);

  const start = new Date(d.startAt);
  const now = Date.now();
  if (start.getTime() < now + RULES.minAdvanceMinutes * 60_000) return c.json(apiError('TOO_SOON', 'That time is too soon to book.'), 400);
  if (start.getTime() > now + (RULES.bookingWindowDays + 1) * 86_400_000) return c.json(apiError('OUT_OF_WINDOW', 'Beyond the booking window.'), 400);

  // Authoritative server-side check: the requested time must be an actually-offered
  // slot (within working hours, on the 15-min grid, not in time off, not occupied).
  // The DB EXCLUDE constraint only guards booking-vs-booking overlap — this closes
  // the gap so the public POST can't book outside hours / off-grid / over time off.
  if (!(await isSlotOffered({ therapistId: therapist.id, durationMinutes: svc.durationMinutes, bufferMinutes: svc.bufferMinutes, now: new Date(now), startMs: start.getTime() }))) {
    return c.json(apiError('UNAVAILABLE', 'That time is not available. Please pick an open slot.'), 409);
  }

  const end = new Date(start.getTime() + svc.durationMinutes * 60_000);
  const occupiedUntil = new Date(end.getTime() + svc.bufferMinutes * 60_000);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = await db
        .insert(booking)
        .values({
          confirmationCode: generateCode(),
          serviceId: svc.id,
          therapistId: therapist.id,
          startAt: start,
          endAt: end,
          occupiedUntil,
          status: 'confirmed',
          customerName: d.customerName,
          customerPhone: d.customerPhone,
          customerEmail: d.customerEmail,
          customerNote: d.customerNote ?? null,
          source: 'online',
          paymentStatus: 'pay_in_person',
        })
        .returning();
      runAfter(c, notifyBookingCreated(row!, svc, therapist));
      return c.json(toBookingDTO(row!, svc, therapist), 201);
    } catch (e) {
      const code = pgCode(e);
      if (code === PG.EXCLUSION_VIOLATION) return c.json(apiError('CONFLICT', 'That time was just booked. Please pick another.'), 409);
      if (code === PG.UNIQUE_VIOLATION) continue; // confirmation_code collision → retry
      throw e;
    }
  }
  return c.json(apiError('INTERNAL', 'Could not allocate a confirmation code'), 500);
});

bookings.get('/lookup', async (c) => {
  const parsed = lookupQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return c.json(apiError('BAD_REQUEST', 'Invalid lookup'), 400);
  const row = (await db.select().from(booking).where(eq(booking.confirmationCode, parsed.data.code.trim().toUpperCase())))[0];
  if (!row) return c.json(apiError('NOT_FOUND', 'Booking not found'), 404);
  const { svc, t } = await loadServiceAndTherapist(row.serviceId, row.therapistId);
  return c.json(toBookingDTO(row, svc!, t!));
});

bookings.post('/:code/cancel', async (c) => {
  const code = c.req.param('code').trim().toUpperCase();
  const row = (await db.select().from(booking).where(eq(booking.confirmationCode, code)))[0];
  if (!row) return c.json(apiError('NOT_FOUND', 'Booking not found'), 404);

  const { svc, t } = await loadServiceAndTherapist(row.serviceId, row.therapistId);
  if (row.status === 'cancelled') return c.json(toBookingDTO(row, svc!, t!)); // idempotent
  if (row.status !== 'confirmed' && row.status !== 'pending') return c.json(apiError('NOT_CANCELLABLE', 'This booking can no longer be cancelled.'), 409);

  const cutoff = new Date(row.startAt).getTime() - RULES.cancelCutoffHours * 3_600_000;
  if (Date.now() > cutoff) return c.json(apiError('TOO_LATE', `Within ${RULES.cancelCutoffHours}h of your appointment — please call us to cancel.`), 422);

  const [updated] = await db.update(booking).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(booking.id, row.id)).returning();
  runAfter(c, notifyBookingCancelled(updated!, svc!, t!));
  return c.json(toBookingDTO(updated!, svc!, t!));
});
