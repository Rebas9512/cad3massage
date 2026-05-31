import { pgTable, uuid, text, integer, boolean, timestamp, time, index } from 'drizzle-orm/pg-core';
import type {
  BookingStatus,
  BookingSource,
  PaymentStatus,
  ServiceCategory,
  StaffRole,
  NotificationChannel,
  NotificationType,
  NotificationStatus,
} from '@cad3/shared';

export const staffMember = pgTable('staff_member', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').$type<StaffRole>().notNull().default('staff'),
  bio: text('bio'),
  photoUrl: text('photo_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const service = pgTable('service', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').$type<ServiceCategory>().notNull(),
  description: text('description'),
  durationMinutes: integer('duration_minutes').notNull(),
  bufferMinutes: integer('buffer_minutes').notNull().default(30),
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').notNull().default('USD'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workingHours = pgTable(
  'working_hours',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    therapistId: uuid('therapist_id')
      .notNull()
      .references(() => staffMember.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
  },
  (t) => ({ therapistIdx: index('working_hours_therapist_idx').on(t.therapistId) }),
);

export const timeOff = pgTable(
  'time_off',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    therapistId: uuid('therapist_id')
      .notNull()
      .references(() => staffMember.id, { onDelete: 'cascade' }),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    reason: text('reason'),
  },
  (t) => ({ therapistIdx: index('time_off_therapist_idx').on(t.therapistId) }),
);

export const booking = pgTable(
  'booking',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    confirmationCode: text('confirmation_code').notNull().unique(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => service.id),
    therapistId: uuid('therapist_id')
      .notNull()
      .references(() => staffMember.id),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    occupiedUntil: timestamp('occupied_until', { withTimezone: true }).notNull(),
    status: text('status').$type<BookingStatus>().notNull().default('confirmed'),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    customerEmail: text('customer_email').notNull(),
    customerNote: text('customer_note'),
    source: text('source').$type<BookingSource>().notNull().default('online'),
    paymentStatus: text('payment_status').$type<PaymentStatus>().notNull().default('pay_in_person'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    therapistStartIdx: index('booking_therapist_start_idx').on(t.therapistId, t.startAt),
    statusIdx: index('booking_status_idx').on(t.status),
  }),
);

export const notification = pgTable(
  'notification',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => booking.id, { onDelete: 'cascade' }),
    channel: text('channel').$type<NotificationChannel>().notNull(),
    type: text('type').$type<NotificationType>().notNull(),
    recipient: text('recipient').notNull(),
    status: text('status').$type<NotificationStatus>().notNull().default('pending'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ bookingIdx: index('notification_booking_idx').on(t.bookingId) }),
);

export const schema = { staffMember, service, workingHours, timeOff, booking, notification };
