import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { availabilityQuerySchema } from '@cad3/shared';
import { db } from '#db';
import { service, staffMember } from '../db/schema.ts';
import { availabilityForTherapist } from '../services/schedule.ts';
import { apiError } from '../lib/errors.ts';

export const availabilityRoute = new Hono();

availabilityRoute.get('/', async (c) => {
  const parsed = availabilityQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return c.json(apiError('BAD_REQUEST', 'Invalid query', parsed.error.flatten()), 400);
  const { serviceId, therapistId, excludeBookingId } = parsed.data;

  const svc = (await db.select().from(service).where(eq(service.id, serviceId)))[0];
  if (!svc || !svc.isActive) return c.json(apiError('NOT_FOUND', 'Service not found'), 404);

  const therapists = await db
    .select()
    .from(staffMember)
    .where(
      therapistId
        ? and(eq(staffMember.id, therapistId), eq(staffMember.isActive, true))
        : eq(staffMember.isActive, true),
    );

  const now = new Date();
  const perTherapist: Array<{ therapistId: string; days: Array<{ date: string; slots: Array<{ startAt: string; endAt: string }> }> }> = [];
  for (const t of therapists) {
    const days = await availabilityForTherapist({
      therapistId: t.id,
      durationMinutes: svc.durationMinutes,
      bufferMinutes: svc.bufferMinutes,
      now,
      excludeBookingId,
    });
    perTherapist.push({ therapistId: t.id, days });
  }

  const dates = perTherapist[0]?.days.map((d) => d.date) ?? [];
  const days = dates.map((date, i) => ({
    date,
    therapists: perTherapist.map((pt) => ({ therapistId: pt.therapistId, slots: pt.days[i]?.slots ?? [] })),
  }));
  return c.json({ serviceId, days });
});
