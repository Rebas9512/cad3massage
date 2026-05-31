// Reminder sweep: email every confirmed booking that has entered the
// "starts within reminderLeadHours" window and hasn't been reminded yet.
// Idempotent via claimReminder (partial unique index on type='reminder'), so it
// is safe to run on any cadence — a booking is reminded exactly once. Same
// function backs the local job and (later) the Cloudflare Workers Cron Trigger.
import { and, eq, gt, lte } from 'drizzle-orm';
import { RULES } from '@cad3/shared';
import { db } from '#db';
import { booking, service, staffMember } from '../../db/schema.ts';
import { emailProvider } from './provider.ts';
import { reminderEmail } from './render.ts';
import { toEmailData, claimReminder, finishReminder } from '../notify.ts';

export interface ReminderSweepResult {
  considered: number;
  sent: number;
  failed: number;
  skipped: number;
}

export async function sendDueReminders(now: Date = new Date()): Promise<ReminderSweepResult> {
  const until = new Date(now.getTime() + RULES.reminderLeadHours * 3_600_000);
  const rows = await db
    .select({ b: booking, s: service, t: staffMember })
    .from(booking)
    .innerJoin(service, eq(service.id, booking.serviceId))
    .innerJoin(staffMember, eq(staffMember.id, booking.therapistId))
    .where(and(eq(booking.status, 'confirmed'), gt(booking.startAt, now), lte(booking.startAt, until)));

  const leadMs = RULES.reminderLeadHours * 3_600_000;
  const out: ReminderSweepResult = { considered: rows.length, sent: 0, failed: 0, skipped: 0 };
  for (const { b, s, t } of rows) {
    if (!b.customerEmail) { out.skipped++; continue; }
    // Booked (or moved) so late it was already inside the reminder window → the
    // confirmation/reschedule email already serves as the reminder; don't double up.
    if (new Date(b.createdAt).getTime() > new Date(b.startAt).getTime() - leadMs) { out.skipped++; continue; }
    if (!(await claimReminder(b.id, b.customerEmail))) { out.skipped++; continue; } // already reminded
    const r = await emailProvider.send(b.customerEmail, reminderEmail(toEmailData(b, s, t)));
    await finishReminder(b.id, r.ok, r.ok ? null : r.error ?? 'send failed');
    if (r.ok) out.sent++; else out.failed++;
  }
  return out;
}
