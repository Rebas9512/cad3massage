/** Studio timezone — all availability math & display use this explicitly; never server local time. */
export const STUDIO_TZ = 'America/Chicago';

export const STORE = {
  name: 'CAD3 Massage',
  phone: '(214) 415-9558',
  phoneTel: '+12144159558',
  website: 'https://cad3massage.com',
  address: {
    street: '6505 W Park Blvd',
    unit: 'Suite 160, Studio 116',
    city: 'Plano',
    state: 'TX',
    zip: '75093',
    country: 'US',
  },
  addressLine: '6505 W Park Blvd, Suite 160, Studio 116, Plano, TX 75093',
  building: 'IMAGE STUDIOS',
} as const;

/** Tunable booking rules (see Business Rules & Config). */
export const RULES = {
  minAdvanceMinutes: 60,
  bookingWindowDays: 30, // bookable up to ~1 month ahead
  cancelCutoffHours: 12,
  bufferMinutes: 30,
  slotGridMinutes: 15,
  reminderLeadHours: 2, // reminder email fires ~2h before the appointment start
} as const;

/** day_of_week 0=Sun..6=Sat → [open, close] local wall-clock (CT). */
export const WORKING_HOURS: Record<number, Array<[string, string]>> = {
  0: [['12:00', '20:00']],
  1: [['10:00', '22:00']],
  2: [['10:00', '22:00']],
  3: [['10:00', '22:00']],
  4: [['10:00', '22:00']],
  5: [['10:00', '22:00']],
  6: [['11:00', '22:00']],
};

export const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
