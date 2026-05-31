// Notification orchestration. Builds the email, sends it via the pluggable
// provider, and records the real outcome (sent/failed + error) in `notification`.
// Best-effort — callers fire-and-forget so a mail hiccup never blocks booking.
import { and, eq } from 'drizzle-orm';
import { db } from '#db';
import { notification } from '../db/schema.ts';
import type { service, staffMember, booking } from '../db/schema.ts';
import { ENV } from '../env.ts';
import { emailProvider } from './email/provider.ts';
import { wechatProvider } from './wechat/provider.ts';
import { staffAlertNudge } from './wechat/render.ts';
import {
  confirmationEmail,
  cancellationEmail,
  rescheduleEmail,
  staffAlertEmail,
  type BookingEmailData,
  type EmailContent,
} from './email/render.ts';

type BookingRow = typeof booking.$inferSelect;
type ServiceRow = typeof service.$inferSelect;
type TherapistRow = typeof staffMember.$inferSelect;
type NotifType = 'confirmation' | 'reminder' | 'cancellation' | 'reschedule' | 'staff_alert';

// Collapse control chars / runs of whitespace — keeps user text from breaking
// the subject line (HTML bodies are additionally escaped in render.ts).
const oneLine = (s: string) => s.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim();

export function toEmailData(b: BookingRow, s: ServiceRow, t: TherapistRow): BookingEmailData {
  return {
    confirmationCode: b.confirmationCode,
    startAt: new Date(b.startAt),
    endAt: new Date(b.endAt),
    customerName: oneLine(b.customerName),
    customerPhone: oneLine(b.customerPhone),
    customerEmail: b.customerEmail,
    serviceName: s.name,
    serviceCode: s.code,
    durationMinutes: s.durationMinutes,
    priceCents: s.priceCents,
    therapistName: t.name,
  };
}

/** Send one email and persist its outcome. Never throws. */
async function deliver(bookingId: string, type: NotifType, to: string, content: EmailContent): Promise<void> {
  if (!to) return; // no recipient (e.g. phone-in booking with no email, or staff inbox unset)
  let ok = false;
  let error: string | null = null;
  try {
    const r = await emailProvider.send(to, content);
    ok = r.ok;
    error = r.ok ? null : r.error ?? 'send failed';
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  try {
    await db.insert(notification).values({
      bookingId,
      channel: 'email',
      type,
      recipient: to,
      status: ok ? 'sent' : 'failed',
      sentAt: ok ? new Date() : null,
      error,
    });
  } catch {
    /* recording is best-effort */
  }
}

/** Push a PII-free staff heads-up to WeChat and record its outcome. Never throws.
 *  Skipped silently if no token (provider falls back to console in dev). */
async function deliverWeChat(bookingId: string, d: BookingEmailData, kind: 'new' | 'cancelled'): Promise<void> {
  let ok = false;
  let error: string | null = null;
  try {
    const r = await wechatProvider.send(staffAlertNudge(d, kind));
    ok = r.ok;
    error = r.ok ? null : r.error ?? 'push failed';
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  try {
    await db.insert(notification).values({
      bookingId,
      channel: 'wechat',
      type: 'staff_alert',
      recipient: 'staff-wechat',
      status: ok ? 'sent' : 'failed',
      sentAt: ok ? new Date() : null,
      error,
    });
  } catch {
    /* best-effort */
  }
}

export async function notifyBookingCreated(b: BookingRow, s: ServiceRow, t: TherapistRow): Promise<void> {
  const d = toEmailData(b, s, t);
  await Promise.all([
    deliver(b.id, 'confirmation', b.customerEmail, confirmationEmail(d)),
    deliver(b.id, 'staff_alert', ENV.STAFF_NOTIFY_EMAIL, staffAlertEmail(d, 'new')),
    deliverWeChat(b.id, d, 'new'),
  ]);
}

/** Phone-in booking entered by staff: email the customer a confirmation (if they
 *  gave an email). No staff alert — the staff member just created it. */
export async function notifyStaffBookingCreated(b: BookingRow, s: ServiceRow, t: TherapistRow): Promise<void> {
  await deliver(b.id, 'confirmation', b.customerEmail, confirmationEmail(toEmailData(b, s, t)));
}

export async function notifyBookingCancelled(b: BookingRow, s: ServiceRow, t: TherapistRow): Promise<void> {
  const d = toEmailData(b, s, t);
  await Promise.all([
    deliver(b.id, 'cancellation', b.customerEmail, cancellationEmail(d)),
    deliver(b.id, 'staff_alert', ENV.STAFF_NOTIFY_EMAIL, staffAlertEmail(d, 'cancelled')),
    deliverWeChat(b.id, d, 'cancelled'),
  ]);
}

/** Staff moved the appointment (time and/or service): email the customer the new
 *  details. No staff alert — the staff member made the change. Also clears any
 *  prior reminder claim so the *new* time becomes eligible for a fresh reminder
 *  (otherwise a rescheduled booking would keep a stale reminder for the old time
 *  and never be reminded about when it actually happens). */
export async function notifyBookingRescheduled(
  b: BookingRow,
  s: ServiceRow,
  t: TherapistRow,
  prev?: { startAt: Date; serviceName: string },
): Promise<void> {
  await clearReminderClaim(b.id);
  await deliver(b.id, 'reschedule', b.customerEmail, rescheduleEmail(toEmailData(b, s, t), prev));
}

/** Drop a booking's reminder row so the reminder sweep can re-claim it (used when
 *  the appointment time changes). Best-effort. */
export async function clearReminderClaim(bookingId: string): Promise<void> {
  try {
    await db.delete(notification).where(and(eq(notification.bookingId, bookingId), eq(notification.type, 'reminder')));
  } catch {
    /* best-effort */
  }
}

/** Staff cancelled the appointment: email the customer the cancellation. No staff
 *  alert — the staff member made the change. */
export async function notifyBookingCancelledByStaff(b: BookingRow, s: ServiceRow, t: TherapistRow): Promise<void> {
  await deliver(b.id, 'cancellation', b.customerEmail, cancellationEmail(toEmailData(b, s, t)));
}

/** Mark a reminder as claimed (idempotent via the partial unique index on
 *  notification(booking_id) WHERE type='reminder'). Returns true if we won the
 *  claim and should send; false if another run already did. */
export async function claimReminder(bookingId: string, recipient: string): Promise<boolean> {
  try {
    await db.insert(notification).values({ bookingId, channel: 'email', type: 'reminder', recipient, status: 'pending' });
    return true;
  } catch {
    return false; // unique violation → already reminded
  }
}

/** Update the claimed reminder row to its final outcome. */
export async function finishReminder(bookingId: string, ok: boolean, error: string | null): Promise<void> {
  try {
    await db
      .update(notification)
      .set({ status: ok ? 'sent' : 'failed', sentAt: ok ? new Date() : null, error })
      .where(and(eq(notification.bookingId, bookingId), eq(notification.type, 'reminder')));
  } catch {
    /* best-effort */
  }
}
