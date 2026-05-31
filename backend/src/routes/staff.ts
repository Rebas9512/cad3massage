import { Hono } from 'hono';
import { and, asc, between, eq, gt, inArray, lt } from 'drizzle-orm';
import { BOOKING_STATUSES, staffCreateBookingSchema, staffPatchBookingSchema } from '@cad3/shared';
import { db } from '#db';
import { booking, service, staffMember, timeOff, workingHours } from '../db/schema.ts';
import { authGuard } from '../middleware/auth.ts';
import { apiError, pgCode, PG } from '../lib/errors.ts';
import { generateCode } from '../lib/code.ts';
import { toBookingDTO } from '../lib/dto.ts';
import { notifyStaffBookingCreated, notifyBookingRescheduled, notifyBookingCancelledByStaff } from '../services/notify.ts';
import { runAfter } from '../lib/async.ts';

export const staff = new Hono();
staff.use('*', authGuard);

const singleTherapist = async () => (await db.select().from(staffMember).where(eq(staffMember.isActive, true)).orderBy(asc(staffMember.name)))[0];

// Schedule data — staff see full customer contact.
staff.get('/bookings', async (c) => {
  const { from, to, status } = c.req.query();
  const conds = [];
  if (from && to) {
    const f = new Date(from);
    const t = new Date(to);
    if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) {
      return c.json(apiError('BAD_REQUEST', 'Invalid from/to date'), 400);
    }
    conds.push(between(booking.startAt, f, t));
  }
  if (status) {
    if (!(BOOKING_STATUSES as readonly string[]).includes(status)) {
      return c.json(apiError('BAD_REQUEST', 'Invalid status filter'), 400);
    }
    conds.push(eq(booking.status, status as (typeof BOOKING_STATUSES)[number]));
  }
  const rows = await db
    .select({ b: booking, s: service, t: staffMember })
    .from(booking)
    .innerJoin(service, eq(service.id, booking.serviceId))
    .innerJoin(staffMember, eq(staffMember.id, booking.therapistId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(booking.startAt));
  return c.json(
    rows.map(({ b, s, t }) => ({
      id: b.id,
      confirmationCode: b.confirmationCode,
      status: b.status,
      startAt: new Date(b.startAt).toISOString(),
      endAt: new Date(b.endAt).toISOString(),
      occupiedUntil: new Date(b.occupiedUntil).toISOString(),
      service: { id: s.id, code: s.code, name: s.name, durationMinutes: s.durationMinutes, priceCents: s.priceCents },
      therapist: { id: t.id, name: t.name },
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      customerEmail: b.customerEmail,
      customerNote: b.customerNote,
      source: b.source,
    })),
  );
});

// Manual entry (phone-in). Same overlap protection as public booking (DB EXCLUDE → 409).
staff.post('/bookings', async (c) => {
  const parsed = staffCreateBookingSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(apiError('BAD_REQUEST', 'Invalid booking', parsed.error.flatten()), 400);
  const d = parsed.data;

  const svc = (await db.select().from(service).where(eq(service.id, d.serviceId)))[0];
  if (!svc) return c.json(apiError('BAD_REQUEST', 'Unknown service'), 400);
  const therapist = d.therapistId
    ? (await db.select().from(staffMember).where(eq(staffMember.id, d.therapistId)))[0]
    : await singleTherapist();
  if (!therapist) return c.json(apiError('BAD_REQUEST', 'No therapist available'), 400);

  const start = new Date(d.startAt);
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
          customerPhone: d.customerPhone ?? '',
          customerEmail: d.customerEmail ?? '',
          customerNote: d.customerNote ?? null,
          source: 'staff',
          paymentStatus: 'pay_in_person',
        })
        .returning();
      runAfter(c, notifyStaffBookingCreated(row!, svc, therapist));
      return c.json(toBookingDTO(row!, svc, therapist), 201);
    } catch (e) {
      const code = pgCode(e);
      if (code === PG.EXCLUSION_VIOLATION) return c.json(apiError('CONFLICT', 'That time overlaps another booking.'), 409);
      if (code === PG.UNIQUE_VIOLATION) continue; // code collision → retry
      throw e;
    }
  }
  return c.json(apiError('INTERNAL', 'Could not allocate a confirmation code'), 500);
});

// Edit: reschedule (startAt/serviceId, recompute end+occupied, re-check overlap), status, note.
staff.patch('/bookings/:id', async (c) => {
  const id = c.req.param('id');
  const parsed = staffPatchBookingSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(apiError('BAD_REQUEST', 'Invalid patch', parsed.error.flatten()), 400);
  const body = parsed.data;

  const existing = (await db.select().from(booking).where(eq(booking.id, id)))[0];
  if (!existing) return c.json(apiError('NOT_FOUND', 'Booking not found'), 404);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status) patch.status = body.status;
  if (body.note !== undefined) patch.customerNote = body.note;

  let svc = (await db.select().from(service).where(eq(service.id, existing.serviceId)))[0];
  const prevStart = new Date(existing.startAt);
  const prevServiceName = svc?.name ?? '';
  if (body.startAt || body.serviceId) {
    if (body.serviceId && body.serviceId !== existing.serviceId) {
      svc = (await db.select().from(service).where(eq(service.id, body.serviceId)))[0];
      if (!svc) return c.json(apiError('BAD_REQUEST', 'Unknown service'), 400);
      patch.serviceId = svc.id;
    }
    const start = new Date(body.startAt ?? existing.startAt);
    const end = new Date(start.getTime() + svc!.durationMinutes * 60_000);
    patch.startAt = start;
    patch.endAt = end;
    patch.occupiedUntil = new Date(end.getTime() + svc!.bufferMinutes * 60_000);
  }

  // What actually changed → which customer email (if any) to send afterward.
  const timeChanged = !!body.startAt && new Date(body.startAt).getTime() !== prevStart.getTime();
  const serviceChanged = !!body.serviceId && body.serviceId !== existing.serviceId;
  const nowCancelled = body.status === 'cancelled' && existing.status !== 'cancelled';

  try {
    const [row] = await db.update(booking).set(patch).where(eq(booking.id, id)).returning();
    if (!row) return c.json(apiError('NOT_FOUND', 'Booking not found'), 404);
    const therapist = (await db.select().from(staffMember).where(eq(staffMember.id, row.therapistId)))[0];

    // Notify the customer of staff-initiated changes (cancel takes precedence over
    // a reschedule in the same patch; status→completed/no_show sends nothing).
    if (nowCancelled) {
      runAfter(c, notifyBookingCancelledByStaff(row, svc!, therapist!));
    } else if ((timeChanged || serviceChanged) && (row.status === 'confirmed' || row.status === 'pending')) {
      runAfter(c, notifyBookingRescheduled(row, svc!, therapist!, { startAt: prevStart, serviceName: prevServiceName }));
    }

    return c.json(toBookingDTO(row, svc!, therapist!));
  } catch (e) {
    if (pgCode(e) === PG.EXCLUSION_VIOLATION) return c.json(apiError('CONFLICT', 'That time overlaps another booking.'), 409);
    throw e;
  }
});

staff.get('/working-hours', async (c) => {
  const therapistId = c.req.query('therapistId') ?? (await singleTherapist())?.id;
  if (!therapistId) return c.json([]);
  const rows = await db.select().from(workingHours).where(eq(workingHours.therapistId, therapistId)).orderBy(asc(workingHours.dayOfWeek));
  return c.json(rows.map((r) => ({ id: r.id, dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime })));
});

staff.put('/working-hours', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { therapistId?: string; hours?: Array<{ dayOfWeek: number; startTime: string; endTime: string }> } | null;
  const therapistId = body?.therapistId ?? (await singleTherapist())?.id;
  if (!therapistId || !Array.isArray(body?.hours)) return c.json(apiError('BAD_REQUEST', 'Invalid payload'), 400);
  await db.delete(workingHours).where(eq(workingHours.therapistId, therapistId));
  if (body.hours.length) {
    await db.insert(workingHours).values(
      body.hours.map((h) => ({ therapistId, dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime })),
    );
  }
  return c.json({ ok: true });
});

staff.get('/time-off', async (c) => {
  const therapistId = c.req.query('therapistId') ?? (await singleTherapist())?.id;
  if (!therapistId) return c.json([]);
  const rows = await db.select().from(timeOff).where(eq(timeOff.therapistId, therapistId)).orderBy(asc(timeOff.startAt));
  return c.json(rows.map((r) => ({ id: r.id, startAt: new Date(r.startAt).toISOString(), endAt: new Date(r.endAt).toISOString(), reason: r.reason })));
});

staff.post('/time-off', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { therapistId?: string; startAt?: string; endAt?: string; reason?: string } | null;
  const therapistId = body?.therapistId ?? (await singleTherapist())?.id;
  if (!therapistId || !body?.startAt || !body?.endAt) return c.json(apiError('BAD_REQUEST', 'Invalid payload'), 400);
  const start = new Date(body.startAt);
  const end = new Date(body.endAt);
  if (!(start < end)) return c.json(apiError('BAD_REQUEST', 'End must be after start'), 400);

  // Time off may only go where there's no booking. Compared against the booking's
  // SERVICE time [start, end) — NOT occupied_until — so time off ignores buffers
  // (it can sit in the buffer gap and adds no buffer of its own).
  const clash = await db
    .select({ id: booking.id })
    .from(booking)
    .where(and(
      eq(booking.therapistId, therapistId),
      inArray(booking.status, ['pending', 'confirmed', 'completed', 'no_show']),
      lt(booking.startAt, end),
      gt(booking.endAt, start),
    ))
    .limit(1);
  if (clash.length) return c.json(apiError('CONFLICT', 'Time off overlaps an existing booking.'), 409);

  // No overlapping/duplicate time off — cancel the old block before adding a new one.
  const offClash = await db
    .select({ id: timeOff.id })
    .from(timeOff)
    .where(and(eq(timeOff.therapistId, therapistId), lt(timeOff.startAt, end), gt(timeOff.endAt, start)))
    .limit(1);
  if (offClash.length) return c.json(apiError('CONFLICT', 'Time off overlaps existing time off.'), 409);

  const [row] = await db
    .insert(timeOff)
    .values({ therapistId, startAt: start, endAt: end, reason: body.reason ?? null })
    .returning();
  return c.json({ id: row!.id }, 201);
});

staff.delete('/time-off/:id', async (c) => {
  await db.delete(timeOff).where(eq(timeOff.id, c.req.param('id')));
  return c.body(null, 204);
});
