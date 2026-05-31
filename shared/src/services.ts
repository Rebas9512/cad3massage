import type { ServiceCategory } from './enums.js';

export interface ServiceSeed {
  code: string;
  category: ServiceCategory;
  durationMinutes: number;
  priceCents: number;
  description: string;
  isActive: boolean;
}

/** Mirrors docs/menu.csv — single source for the seed. 14 active + 2 reserved. */
export const SERVICE_CATALOG: ServiceSeed[] = [
  { code: 'A1', category: 'Chair', durationMinutes: 15, priceCents: 2000, description: 'Chair massage', isActive: true },
  { code: 'A2', category: 'Chair', durationMinutes: 20, priceCents: 3500, description: 'Chair massage', isActive: true },
  { code: 'A3', category: 'Chair', durationMinutes: 30, priceCents: 5000, description: 'Chair massage', isActive: true },
  { code: 'F1', category: 'Foot', durationMinutes: 30, priceCents: 3500, description: '30 min foot', isActive: true },
  { code: 'F3', category: 'Combo', durationMinutes: 60, priceCents: 6000, description: '45 min foot + 15 min body', isActive: true },
  { code: 'F4', category: 'Combo', durationMinutes: 60, priceCents: 6000, description: '30 min foot + 30 min body', isActive: true },
  { code: 'F5', category: 'Combo', durationMinutes: 90, priceCents: 9000, description: '60 min foot + 30 min body', isActive: true },
  { code: 'C1', category: 'Combo', durationMinutes: 70, priceCents: 7500, description: '35 min foot + 35 min body', isActive: true },
  { code: 'C2', category: 'Combo', durationMinutes: 90, priceCents: 9000, description: '45 min foot + 45 min body', isActive: true },
  { code: 'C3', category: 'Combo', durationMinutes: 90, priceCents: 9000, description: '30 min foot + 1 hour body', isActive: true },
  { code: 'B1', category: 'Body', durationMinutes: 30, priceCents: 5500, description: 'Body', isActive: true },
  { code: 'B2', category: 'Body', durationMinutes: 60, priceCents: 7500, description: 'Body', isActive: true },
  { code: 'B3', category: 'Body', durationMinutes: 90, priceCents: 10500, description: 'Body', isActive: true },
  { code: 'B5', category: 'Body', durationMinutes: 120, priceCents: 13500, description: 'Body', isActive: true },
  // Reserved — must not be public.
  { code: 'B4', category: 'Body', durationMinutes: 60, priceCents: 12500, description: 'Body, 4 hands (needs two therapists)', isActive: false },
  { code: 'H1', category: 'Head', durationMinutes: 60, priceCents: 6000, description: '60 min head', isActive: false },
];

export const CATEGORY_ORDER: ServiceCategory[] = ['Chair', 'Foot', 'Combo', 'Body', 'Head'];

export const serviceDisplayName = (s: { category: string; description: string; durationMinutes: number }): string =>
  `${s.category} — ${s.description} (${s.durationMinutes} min)`;

export const formatUsd = (cents: number): string => {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
};
