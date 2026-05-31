// Expected seed data — single source for assertions. Mirrors docs/menu.csv
// and '01 - Planning/Business Rules & Config'. Keep in sync with the seed script.

export const STUDIO_TZ = 'America/Chicago';
export const STORE_PHONE = '(214) 415-9558';

export interface SvcFixture {
  code: string;
  category: 'Chair' | 'Foot' | 'Combo' | 'Body' | 'Head';
  durationMinutes: number;
  priceCents: number;
}

/** 14 services that MUST be public. */
export const ACTIVE_SERVICES: SvcFixture[] = [
  { code: 'A1', category: 'Chair', durationMinutes: 15, priceCents: 2000 },
  { code: 'A2', category: 'Chair', durationMinutes: 20, priceCents: 3500 },
  { code: 'A3', category: 'Chair', durationMinutes: 30, priceCents: 5000 },
  { code: 'F1', category: 'Foot', durationMinutes: 30, priceCents: 3500 },
  { code: 'F3', category: 'Combo', durationMinutes: 60, priceCents: 6000 },
  { code: 'F4', category: 'Combo', durationMinutes: 60, priceCents: 6000 },
  { code: 'F5', category: 'Combo', durationMinutes: 90, priceCents: 9000 },
  { code: 'C1', category: 'Combo', durationMinutes: 70, priceCents: 7500 },
  { code: 'C2', category: 'Combo', durationMinutes: 90, priceCents: 9000 },
  { code: 'C3', category: 'Combo', durationMinutes: 90, priceCents: 9000 },
  { code: 'B1', category: 'Body', durationMinutes: 30, priceCents: 5500 },
  { code: 'B2', category: 'Body', durationMinutes: 60, priceCents: 7500 },
  { code: 'B3', category: 'Body', durationMinutes: 90, priceCents: 10500 },
  { code: 'B5', category: 'Body', durationMinutes: 120, priceCents: 13500 },
];

/** Reserved — must NOT appear in public /services. */
export const INACTIVE_CODES = ['B4', 'H1'];

export const CATEGORY_COUNTS: Record<string, number> = { Chair: 3, Foot: 1, Combo: 6, Body: 4 };

/** day_of_week 0=Sun..6=Sat → [open, close] local (CT). */
export const WORKING_HOURS: Record<number, [string, string][]> = {
  0: [['12:00', '20:00']],
  1: [['10:00', '22:00']],
  2: [['10:00', '22:00']],
  3: [['10:00', '22:00']],
  4: [['10:00', '22:00']],
  5: [['10:00', '22:00']],
  6: [['11:00', '22:00']],
};

export const RULES = {
  minAdvanceMinutes: 60,
  windowDays: 30, // bookable up to ~1 month ahead (raised from 7 on 2026-05-31)
  cancelCutoffHours: 12,
  bufferMinutes: 30,
  slotGridMinutes: 15,
};

export const CODE_RE = /^CAD3-[2-9A-HJ-NP-Z]{5}$/; // no 0/O/1/I/L
export const GRID_MINUTES = ['00', '15', '30', '45'];
