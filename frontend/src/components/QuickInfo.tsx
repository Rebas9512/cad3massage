import { STORE, STUDIO_TZ, WORKING_HOURS } from '@cad3/shared';

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE.addressLine)}`;
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun

const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
const fmtHm = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  const sfx = h! < 12 || h === 24 ? 'a' : 'p';
  const h12 = h! % 12 === 0 ? 12 : h! % 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}${sfx}` : `${h12}${sfx}`;
};
const fmtUntil = (s: string) => {
  const h = Number(s.slice(0, 2));
  const sfx = h < 12 ? 'AM' : 'PM';
  return `${h % 12 === 0 ? 12 : h % 12} ${sfx}`;
};
const dayHours = (dow: number) => (WORKING_HOURS[dow] ?? []).map(([o, c]) => `${fmtHm(o)} – ${fmtHm(c)}`).join(', ') || 'Closed';

function nowInCt() {
  const now = new Date();
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: STUDIO_TZ, weekday: 'short' }).format(now);
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: STUDIO_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  return { dow: DOW_LABELS.indexOf(wd), minutes: Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5)) };
}

export function QuickInfo() {
  const { dow, minutes } = nowInCt();
  const openSeg = (WORKING_HOURS[dow] ?? []).find(([o, c]) => minutes >= toMin(o) && minutes < toMin(c));

  return (
    <section className="border-y border-line bg-surface">
      <div className="container-wide grid items-stretch gap-6 py-8 lg:grid-cols-[minmax(240px,340px)_1fr] lg:gap-12">
        {/* Visit */}
        <div className="flex flex-col justify-center lg:border-r lg:border-line lg:pr-10">
          <p className="eyebrow">Visit us</p>
          <p className="mt-3 text-sm font-medium text-ink">{STORE.address.street}, {STORE.address.unit}</p>
          <p className="text-sm font-medium text-ink">{STORE.address.city}, {STORE.address.state} {STORE.address.zip}</p>
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-sage-deep hover:underline">
            Get directions ↗
          </a>
        </div>

        {/* Hours */}
        <div className="flex flex-col justify-center">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="eyebrow">Hours · Central time</p>
            {openSeg ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-deep">
                <span className="h-2 w-2 rounded-full bg-sage" /> Open now · until {fmtUntil(openSeg[1])}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                <span className="h-2 w-2 rounded-full bg-muted" /> Closed now
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {DISPLAY_ORDER.map((d) => {
              const today = d === dow;
              return (
                <div key={d} className={`rounded-md px-2 py-2 text-center ${today ? 'bg-[#E7EEE7] ring-1 ring-sage/40' : ''}`}>
                  <p className={`text-sm font-semibold ${today ? 'text-sage-deep' : 'text-ink'}`}>{DOW_LABELS[d]}</p>
                  <p className="mt-0.5 text-xs text-muted">{dayHours(d)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
