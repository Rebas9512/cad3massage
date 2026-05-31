// Email content builders. Each returns { subject, html, text }. Times are shown
// in the studio timezone (CT). Emails are one-way / no-reply — every footer
// points to the phone for changes.
import { formatInTimeZone } from 'date-fns-tz';
import { STORE, STUDIO_TZ, RULES, formatUsd } from '@cad3/shared';
import { ENV } from '../../env.ts';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export interface BookingEmailData {
  confirmationCode: string;
  startAt: Date;
  endAt: Date;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceName: string;
  serviceCode: string;
  durationMinutes: number;
  priceCents: number;
  therapistName: string;
}

const C = { sage: '#6B8F71', forest: '#2F3E34', ink: '#283027', cream: '#F5F1E8', line: '#E4DECF', muted: '#8C9085' };

const fmtDate = (d: Date) => formatInTimeZone(d, STUDIO_TZ, 'EEEE, MMMM d, yyyy');
const fmtTime = (d: Date) => formatInTimeZone(d, STUDIO_TZ, 'h:mm a zzz');
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE.addressLine)}`;
const manageUrl = (code: string) => `${ENV.APP_BASE_URL}/manage?code=${encodeURIComponent(code)}`;
const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));

/** Shared HTML shell: heading band + body + standard no-reply footer. */
function layout(opts: { heading: string; accent?: string; bodyHtml: string }): string {
  const accent = opts.accent ?? C.sage;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:${C.cream};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${C.ink}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};padding:24px 12px">
   <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${C.line};border-radius:16px;overflow:hidden">
     <tr><td style="background:${accent};padding:22px 28px">
       <div style="color:#ffffff;font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">${esc(STORE.name)}</div>
       <div style="color:#ffffff;font-size:22px;font-weight:600;margin-top:4px">${esc(opts.heading)}</div>
     </td></tr>
     <tr><td style="padding:28px">${opts.bodyHtml}</td></tr>
     <tr><td style="padding:18px 28px;border-top:1px solid ${C.line};background:#FBFAF6;font-size:12px;color:${C.muted};line-height:1.6">
       This is an automated message — <strong>please do not reply</strong>. For any change or question, call us at
       <a href="tel:${STORE.phoneTel}" style="color:${C.forest};text-decoration:none">${esc(STORE.phone)}</a>.<br/>
       ${esc(STORE.name)} · ${esc(STORE.addressLine)}
     </td></tr>
    </table>
   </td></tr>
  </table>
 </body></html>`;
}

function detailRows(d: BookingEmailData): string {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:${C.muted};font-size:13px;width:120px">${k}</td><td style="padding:6px 0;font-size:14px;font-weight:500">${v}</td></tr>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
    ${row('Service', `${esc(d.serviceName)} <span style="color:${C.muted};font-weight:400">(${esc(d.serviceCode)})</span>`)}
    ${row('Date', esc(fmtDate(d.startAt)))}
    ${row('Time', `${esc(fmtTime(d.startAt))} · ${d.durationMinutes} min`)}
    ${row('Therapist', esc(d.therapistName))}
    ${row('Total', `${formatUsd(d.priceCents)} — pay in person`)}
  </table>`;
}

const btn = (href: string, label: string, color = C.sage) =>
  `<a href="${href}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:999px">${label}</a>`;

const codeBlock = (code: string) =>
  `<div style="margin:18px 0;text-align:center">
     <div style="font-size:12px;color:${C.muted};text-transform:uppercase;letter-spacing:.06em">Confirmation code</div>
     <div style="font-size:24px;font-weight:700;letter-spacing:.12em;font-family:Menlo,Consolas,monospace;color:${C.forest};margin-top:4px">${esc(code)}</div>
   </div>`;

const textFooter = `\n\nThis is an automated message — please do not reply. For any change or question, call ${STORE.phone}.\n${STORE.name} · ${STORE.addressLine}`;

const textDetails = (d: BookingEmailData) =>
  `Service:   ${d.serviceName} (${d.serviceCode})
Date:      ${fmtDate(d.startAt)}
Time:      ${fmtTime(d.startAt)} · ${d.durationMinutes} min
Therapist: ${d.therapistName}
Total:     ${formatUsd(d.priceCents)} — pay in person`;

// ---- Customer: confirmation ----
export function confirmationEmail(d: BookingEmailData): EmailContent {
  return {
    subject: `You're booked — ${fmtDate(d.startAt)} at ${STORE.name}`,
    html: layout({
      heading: "You're booked",
      bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">Hi ${esc(d.customerName)}, your appointment is confirmed. We look forward to seeing you.</p>
        ${codeBlock(d.confirmationCode)}
        ${detailRows(d)}
        <div style="margin:22px 0 6px">${btn(manageUrl(d.confirmationCode), 'Manage booking')} &nbsp; ${btn(mapsUrl, 'Get directions', C.forest)}</div>
        <p style="margin:16px 0 0;font-size:13px;color:${C.muted};line-height:1.6">Need to cancel? You can do it online up to ${RULES.cancelCutoffHours}h before your appointment, or call us anytime.</p>`,
    }),
    text: `Hi ${d.customerName}, your appointment at ${STORE.name} is confirmed.\n\nConfirmation code: ${d.confirmationCode}\n\n${textDetails(d)}\n\nManage booking: ${manageUrl(d.confirmationCode)}\nDirections: ${mapsUrl}\n\nNeed to cancel? Online up to ${RULES.cancelCutoffHours}h before, or call us.${textFooter}`,
  };
}

// ---- Customer: cancellation ----
export function cancellationEmail(d: BookingEmailData): EmailContent {
  return {
    subject: `Cancelled — your ${fmtDate(d.startAt)} appointment`,
    html: layout({
      heading: 'Booking cancelled',
      accent: C.muted,
      bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">Hi ${esc(d.customerName)}, your appointment below has been cancelled. No charge applies.</p>
        ${detailRows(d)}
        <p style="margin:18px 0 6px;font-size:14px;line-height:1.6">Changed your mind? You're always welcome to book again.</p>
        <div style="margin:10px 0 0">${btn(`${ENV.APP_BASE_URL}/book`, 'Book again')}</div>`,
    }),
    text: `Hi ${d.customerName}, your appointment at ${STORE.name} has been cancelled. No charge applies.\n\n${textDetails(d)}\n\nBook again: ${ENV.APP_BASE_URL}/book${textFooter}`,
  };
}

// ---- Customer: reminder (~2h before) ----
export function reminderEmail(d: BookingEmailData): EmailContent {
  return {
    subject: `Reminder — your appointment today at ${fmtTime(d.startAt)}`,
    html: layout({
      heading: 'See you soon',
      bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">Hi ${esc(d.customerName)}, a quick reminder of your upcoming appointment.</p>
        ${detailRows(d)}
        <div style="margin:22px 0 6px">${btn(mapsUrl, 'Get directions')} &nbsp; ${btn(manageUrl(d.confirmationCode), 'Manage booking', C.forest)}</div>
        <p style="margin:16px 0 0;font-size:13px;color:${C.muted};line-height:1.6">Running late or need to change something? Please call ${esc(STORE.phone)}.</p>`,
    }),
    text: `Hi ${d.customerName}, a reminder of your appointment at ${STORE.name}.\n\n${textDetails(d)}\n\nDirections: ${mapsUrl}\nManage booking: ${manageUrl(d.confirmationCode)}${textFooter}`,
  };
}

// ---- Customer: rescheduled (staff moved the time and/or service) ----
export function rescheduleEmail(d: BookingEmailData, prev?: { startAt: Date; serviceName: string }): EmailContent {
  const prevChanged = prev && (prev.startAt.getTime() !== d.startAt.getTime() || prev.serviceName !== d.serviceName);
  const prevNote = prevChanged
    ? `<p style="margin:14px 0 0;font-size:13px;color:${C.muted};line-height:1.6">Previously: ${esc(fmtDate(prev!.startAt))} at ${esc(fmtTime(prev!.startAt))}${prev!.serviceName !== d.serviceName ? ` · ${esc(prev!.serviceName)}` : ''}</p>`
    : '';
  return {
    subject: `Updated — your appointment is now ${fmtDate(d.startAt)} at ${fmtTime(d.startAt)}`,
    html: layout({
      heading: 'Appointment updated',
      accent: C.forest,
      bodyHtml: `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">Hi ${esc(d.customerName)}, your appointment has been rescheduled. Here are the new details:</p>
        ${detailRows(d)}
        ${prevNote}
        <div style="margin:22px 0 6px">${btn(manageUrl(d.confirmationCode), 'Manage booking')} &nbsp; ${btn(mapsUrl, 'Get directions', C.forest)}</div>
        <p style="margin:16px 0 0;font-size:13px;color:${C.muted};line-height:1.6">Didn't expect this change? Please call ${esc(STORE.phone)}.</p>`,
    }),
    text: `Hi ${d.customerName}, your appointment at ${STORE.name} has been rescheduled.\n\nNEW DETAILS:\n${textDetails(d)}${prevChanged ? `\n\nPreviously: ${fmtDate(prev!.startAt)} at ${fmtTime(prev!.startAt)}` : ''}\n\nManage booking: ${manageUrl(d.confirmationCode)}\nDirections: ${mapsUrl}\n\nDidn't expect this change? Please call ${STORE.phone}.${textFooter}`,
  };
}

// ---- Staff: internal alert (new / cancelled) ----
export function staffAlertEmail(d: BookingEmailData, kind: 'new' | 'cancelled'): EmailContent {
  const isNew = kind === 'new';
  const contact = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:6px 0;color:${C.muted};font-size:13px;width:120px">Customer</td><td style="padding:6px 0;font-size:14px;font-weight:500">${esc(d.customerName)}</td></tr>
      <tr><td style="padding:6px 0;color:${C.muted};font-size:13px">Phone</td><td style="padding:6px 0;font-size:14px">${esc(d.customerPhone) || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:${C.muted};font-size:13px">Email</td><td style="padding:6px 0;font-size:14px">${esc(d.customerEmail) || '—'}</td></tr>
    </table>`;
  return {
    subject: `${isNew ? 'New booking' : 'Cancelled'}: ${d.customerName} · ${fmtDate(d.startAt)} ${fmtTime(d.startAt)}`,
    html: layout({
      heading: isNew ? 'New booking' : 'Booking cancelled',
      accent: isNew ? C.sage : C.muted,
      bodyHtml: `${detailRows(d)}<div style="height:10px"></div>${contact}
        <div style="margin:16px 0 0;font-size:12px;color:${C.muted}">Code ${esc(d.confirmationCode)}</div>`,
    }),
    text: `${isNew ? 'New booking' : 'Cancelled booking'} at ${STORE.name}\n\n${textDetails(d)}\n\nCustomer: ${d.customerName}\nPhone: ${d.customerPhone || '—'}\nEmail: ${d.customerEmail || '—'}\nCode: ${d.confirmationCode}`,
  };
}
