import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

/** YYYY-MM-DD for an instant in the studio timezone. */
export const ctDateStr = (d: Date, tz: string): string => formatInTimeZone(d, tz, 'yyyy-MM-dd');

/** Wall-clock (date + HH:MM in tz) → absolute instant. */
export const wallToInstant = (dateStr: string, hm: string, tz: string): Date =>
  fromZonedTime(`${dateStr}T${hm.length === 5 ? hm : hm.slice(0, 5)}:00`, tz);

const pad = (n: number) => String(n).padStart(2, '0');

/** Calendar dates from `startStr` for `days` ahead (inclusive), DST-safe via a noon anchor. */
export function eachCtDate(startStr: string, days: number): Array<{ date: string; dow: number }> {
  const [y, m, d] = startStr.split('-').map(Number);
  const base = Date.UTC(y!, m! - 1, d!, 12);
  const out: Array<{ date: string; dow: number }> = [];
  for (let i = 0; i <= days; i++) {
    const dt = new Date(base + i * 86_400_000);
    out.push({
      date: `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`,
      dow: dt.getUTCDay(),
    });
  }
  return out;
}
