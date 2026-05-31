import { z } from 'zod';

/** Loose US-ish phone: digits/spaces/()+-., at least 10 digits. */
const phone = z
  .string()
  .trim()
  .min(7)
  .max(40)
  .refine((v) => (v.match(/\d/g)?.length ?? 0) >= 10, 'phone must contain at least 10 digits');

export const createBookingSchema = z.object({
  serviceId: z.string().uuid(),
  therapistId: z.string().uuid().optional(),
  startAt: z.string().datetime({ offset: true }),
  customerName: z.string().trim().min(1).max(120),
  customerPhone: phone,
  customerEmail: z.string().trim().email(),
  customerNote: z.string().max(1000).optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// Lookup & cancel are by confirmation code only (simplified — no contact needed).
export const lookupQuerySchema = z.object({
  code: z.string().trim().min(3),
});

export const cancelSchema = z.object({
  contact: z.string().trim().optional(),
});

export const availabilityQuerySchema = z.object({
  serviceId: z.string().uuid(),
  therapistId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Staff reschedule: ignore this booking's own occupancy so it can move to a nearby time.
  excludeBookingId: z.string().uuid().optional(),
});

// Staff manual entry (phone-in bookings): name required; phone/email optional
// (a caller may not give an email). Empty strings are accepted and stored as ''.
export const staffCreateBookingSchema = z.object({
  serviceId: z.string().uuid(),
  therapistId: z.string().uuid().optional(),
  startAt: z.string().datetime({ offset: true }),
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z.string().trim().max(40).optional(),
  customerEmail: z.string().trim().email().optional().or(z.literal('')),
  customerNote: z.string().max(1000).optional(),
});
export type StaffCreateBookingInput = z.infer<typeof staffCreateBookingSchema>;

// Staff edit: reschedule (startAt / serviceId), status change, note edit — all optional.
export const staffPatchBookingSchema = z.object({
  startAt: z.string().datetime({ offset: true }).optional(),
  serviceId: z.string().uuid().optional(),
  status: z.enum(['confirmed', 'completed', 'no_show', 'cancelled']).optional(),
  note: z.string().max(1000).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
});
