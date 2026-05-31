export const SERVICE_CATEGORIES = ['Chair', 'Foot', 'Combo', 'Body', 'Head'] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_SOURCES = ['online', 'staff'] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const STAFF_ROLES = ['staff', 'admin'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const PAYMENT_STATUSES = ['pay_in_person'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'wechat'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_TYPES = [
  'confirmation',
  'reminder',
  'cancellation',
  'reschedule',
  'staff_alert',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_STATUSES = ['pending', 'sent', 'failed'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
