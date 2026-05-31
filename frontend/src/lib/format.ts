import { STUDIO_TZ } from '@cad3/shared';

const dt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: STUDIO_TZ, ...opts });

/** All display times are rendered in the studio timezone (CT), regardless of the viewer's locale. */
export const fmtTime = (iso: string) => dt({ hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
export const fmtDateLong = (iso: string) =>
  dt({ weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(iso));
export const fmtDateShort = (iso: string) => dt({ weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(iso));
export const fmtWeekday = (iso: string) => dt({ weekday: 'short' }).format(new Date(iso));
export const fmtDayNum = (iso: string) => dt({ day: 'numeric' }).format(new Date(iso));
export const fmtMonth = (iso: string) => dt({ month: 'short' }).format(new Date(iso));

export const usd = (cents: number) => {
  const d = cents / 100;
  return Number.isInteger(d) ? `$${d}` : `$${d.toFixed(2)}`;
};

/** Convert a wall-clock time (CT date + minutes-of-day) to the UTC instant.
 * Two-pass offset correction handles DST. Mirrors the backend's wallToInstant. */
export function ctWallToInstant(dateStr: string, minutes: number): Date {
  const [y, mo, dd] = dateStr.split('-').map(Number);
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  let utc = Date.UTC(y!, mo! - 1, dd!, hh, mm);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: STUDIO_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(new Date(utc));
    const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
    const hour = g('hour') === 24 ? 0 : g('hour');
    const ctAsUtc = Date.UTC(g('year'), g('month') - 1, g('day'), hour, g('minute'), g('second'));
    utc = Date.UTC(y!, mo! - 1, dd!, hh, mm) - (ctAsUtc - utc);
  }
  return new Date(utc);
}
