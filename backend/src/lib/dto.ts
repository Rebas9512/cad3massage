import type { service as serviceTable, staffMember, booking } from '../db/schema.ts';

type ServiceRow = typeof serviceTable.$inferSelect;
type TherapistRow = typeof staffMember.$inferSelect;
type BookingRow = typeof booking.$inferSelect;

export const toServiceDTO = (s: ServiceRow) => ({
  id: s.id,
  code: s.code,
  name: s.name,
  category: s.category,
  description: s.description ?? '',
  durationMinutes: s.durationMinutes,
  priceCents: s.priceCents,
  currency: s.currency,
});

export const toTherapistDTO = (t: TherapistRow) => ({
  id: t.id,
  name: t.name,
  bio: t.bio,
  photoUrl: t.photoUrl,
});

export const toBookingDTO = (b: BookingRow, s: ServiceRow, t: TherapistRow) => ({
  id: b.id,
  confirmationCode: b.confirmationCode,
  status: b.status,
  startAt: new Date(b.startAt).toISOString(),
  endAt: new Date(b.endAt).toISOString(),
  service: {
    id: s.id,
    code: s.code,
    name: s.name,
    durationMinutes: s.durationMinutes,
    priceCents: s.priceCents,
    currency: s.currency,
  },
  therapist: { id: t.id, name: t.name },
  customerName: b.customerName,
  customerPhone: b.customerPhone,
  customerEmail: b.customerEmail,
  customerNote: b.customerNote,
});

const digits = (s: string) => (s.match(/\d/g) ?? []).join('');

/** Identity check for lookup/cancel: email match or last-10-digits phone match. */
export function contactMatches(b: BookingRow, contact: string): boolean {
  const c = contact.trim().toLowerCase();
  if (b.customerEmail.toLowerCase() === c) return true;
  const cd = digits(contact);
  return cd.length >= 10 && digits(b.customerPhone).endsWith(cd.slice(-10));
}
