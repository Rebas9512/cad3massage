// Pure availability engine. Deterministic: takes `now` + all state as input
// (no hidden clock / DB), so it is unit-testable. See test plan §6.
import { RULES, STUDIO_TZ, WORKING_HOURS } from '@cad3/shared';
import { ctDateStr, eachCtDate, wallToInstant } from '../lib/time.ts';

export interface Interval {
  start: number; // epoch ms, inclusive
  end: number; // epoch ms, exclusive
}

export interface AvailabilityInput {
  now: Date;
  durationMinutes: number;
  bufferMinutes: number;
  occupied: Interval[]; // existing bookings as [start_at, occupied_until)
  timeOff: Interval[]; // [start_at, end_at)
  tz?: string;
  workingHours?: Record<number, Array<[string, string]>>;
  windowDays?: number;
  gridMinutes?: number;
  minAdvanceMinutes?: number;
}

export interface DaySlots {
  date: string;
  slots: Array<{ startAt: string; endAt: string }>;
}

export function computeAvailability(input: AvailabilityInput): DaySlots[] {
  const tz = input.tz ?? STUDIO_TZ;
  const wh = input.workingHours ?? WORKING_HOURS;
  const grid = (input.gridMinutes ?? RULES.slotGridMinutes) * 60_000;
  const serviceMs = input.durationMinutes * 60_000;
  const occupiedMs = serviceMs + input.bufferMinutes * 60_000;
  const window = input.windowDays ?? RULES.bookingWindowDays;
  const minStart = input.now.getTime() + (input.minAdvanceMinutes ?? RULES.minAdvanceMinutes) * 60_000;

  const days = eachCtDate(ctDateStr(input.now, tz), window);
  const out: DaySlots[] = [];

  for (const { date, dow } of days) {
    const slots: DaySlots['slots'] = [];
    for (const [open, close] of wh[dow] ?? []) {
      const openMs = wallToInstant(date, open, tz).getTime();
      const closeMs = wallToInstant(date, close, tz).getTime();
      // Start time may be as late as closing time — a session may run past close.
      for (let s = openMs; s <= closeMs; s += grid) {
        if (s < minStart) continue;
        const serviceEnd = s + serviceMs;
        const occEnd = s + occupiedMs;
        // Candidate occupancy [s, occEnd) must not overlap an existing booking.
        if (input.occupied.some((b) => s < b.end && b.start < occEnd)) continue;
        // Service time [s, serviceEnd) must not overlap time off.
        if (input.timeOff.some((b) => s < b.end && b.start < serviceEnd)) continue;
        slots.push({ startAt: new Date(s).toISOString(), endAt: new Date(serviceEnd).toISOString() });
      }
    }
    out.push({ date, slots });
  }
  return out;
}
