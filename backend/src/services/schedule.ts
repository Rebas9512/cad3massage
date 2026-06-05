// DB-backed availability loader. Single source of truth shared by the public
// availability endpoint AND the booking-creation guard, so what we *offer* and
// what we *accept* can never drift apart. Pulls the therapist's real working
// hours from the DB (not the hardcoded constant) so the staff Working Hours
// editor actually drives customer availability.
import { and, eq, gt, inArray, ne } from 'drizzle-orm';
import { db } from '#db';
import { booking, timeOff, workingHours } from '../db/schema.ts';
import { computeAvailability, type DaySlots } from './availability.ts';

/** DB working_hours rows → engine shape `{ dow: [[open, close], ...] }`. */
export async function therapistWorkingHours(therapistId: string): Promise<Record<number, Array<[string, string]>>> {
  const rows = await db.select().from(workingHours).where(eq(workingHours.therapistId, therapistId));
  const map: Record<number, Array<[string, string]>> = {};
  for (const r of rows) (map[r.dayOfWeek] ??= []).push([r.startTime, r.endTime]);
  return map;
}

export interface TherapistAvailabilityOpts {
  therapistId: string;
  durationMinutes: number;
  bufferMinutes: number;
  now: Date;
  /** Reschedule: ignore this booking's own occupancy so it can shift to a nearby time. */
  excludeBookingId?: string;
  /** Staff walk-in override: minutes of required lead time (0 = offer near-term slots). Default = RULES.minAdvanceMinutes. */
  minAdvanceMinutes?: number;
}

/** Offered slots for one therapist+service, honoring DB working hours, bookings, and time off. */
export async function availabilityForTherapist(opts: TherapistAvailabilityOpts): Promise<DaySlots[]> {
  const { therapistId, durationMinutes, bufferMinutes, now, excludeBookingId, minAdvanceMinutes } = opts;
  const bookings = await db
    .select({ start: booking.startAt, end: booking.occupiedUntil })
    .from(booking)
    .where(and(
      eq(booking.therapistId, therapistId),
      inArray(booking.status, ['confirmed', 'pending']),
      gt(booking.occupiedUntil, now),
      excludeBookingId ? ne(booking.id, excludeBookingId) : undefined,
    ));
  const offs = await db
    .select({ start: timeOff.startAt, end: timeOff.endAt })
    .from(timeOff)
    .where(and(eq(timeOff.therapistId, therapistId), gt(timeOff.endAt, now)));
  const wh = await therapistWorkingHours(therapistId);
  return computeAvailability({
    now,
    durationMinutes,
    bufferMinutes,
    occupied: bookings.map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() })),
    timeOff: offs.map((o) => ({ start: new Date(o.start).getTime(), end: new Date(o.end).getTime() })),
    workingHours: wh,
    minAdvanceMinutes,
  });
}

/** True iff `startAt` (epoch ms) is an actually-offered start time for this therapist+service. */
export async function isSlotOffered(opts: TherapistAvailabilityOpts & { startMs: number }): Promise<boolean> {
  const days = await availabilityForTherapist(opts);
  return days.some((d) => d.slots.some((s) => Date.parse(s.startAt) === opts.startMs));
}
