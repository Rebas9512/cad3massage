import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CATEGORY_ORDER, STORE, STUDIO_TZ, WORKING_HOURS, type ServiceDTO, type SlotDTO } from '@cad3/shared';
import { api } from '../../lib/api';
import { fmtDateLong, fmtDayNum, fmtTime, fmtWeekday, usd } from '../../lib/format';
import { Logo } from '../../components/Logo';

interface Details { name: string; phone: string; email: string; note: string }
const STEP_LABELS = ['Service', 'Date & Time', 'Your details', 'Confirm'];

export function BookingFlow() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [service, setService] = useState<ServiceDTO | null>(null);
  const [slot, setSlot] = useState<SlotDTO | null>(null);
  const [details, setDetails] = useState<Details>({ name: '', phone: '', email: '', note: '' });
  const [code, setCode] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const back = () => (step > 1 ? setStep((s) => s - 1) : nav('/'));

  if (step === 5 && code) return <Success code={code} service={service!} slot={slot!} name={details.name} />;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <WizardHeader step={step} onBack={back} />
      <main className="flex flex-1 flex-col">
        {step === 1 && (
          <SelectService selected={service} onSelect={setService} onContinue={() => setStep(2)} />
        )}
        {step === 2 && service && (
          <DateTime
            service={service}
            selected={slot}
            conflict={conflict}
            onSelect={(s) => { setSlot(s); setConflict(false); }}
            onContinue={() => setStep(3)}
          />
        )}
        {step === 3 && service && slot && (
          <YourDetails details={details} service={service} slot={slot} onChange={setDetails} onContinue={() => setStep(4)} />
        )}
        {step === 4 && service && slot && (
          <Confirm
            service={service}
            slot={slot}
            details={details}
            onEdit={(s) => setStep(s)}
            onConfirmed={(c) => { setCode(c); setStep(5); }}
            onConflict={() => { setConflict(true); setSlot(null); setStep(2); }}
          />
        )}
      </main>
    </div>
  );
}

function WizardHeader({ step, onBack }: { step: number; onBack: () => void }) {
  return (
    <header className="border-b border-line bg-bg">
      <div className="container-x py-4">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-sage-deep">
            ← Back
          </button>
          <span className="font-heading text-lg font-semibold text-ink">Book a Session</span>
          <span className="text-sm font-semibold text-muted">Step {step}/4</span>
        </div>
        <div className="mt-3 hidden items-center gap-2 sm:flex">
          {STEP_LABELS.map((l, i) => (
            <div key={l} className="flex flex-1 items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-pill text-xs font-semibold ${i + 1 <= step ? 'bg-sage text-white' : 'bg-line text-muted'}`}>
                {i + 1 < step ? '✓' : i + 1}
              </span>
              <span className={`text-sm ${i + 1 === step ? 'font-semibold text-ink' : 'text-muted'}`}>{l}</span>
              {i < 3 && <span className="h-px flex-1 bg-line" />}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-1.5 sm:hidden">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={`h-1 flex-1 rounded-pill ${i <= step ? 'bg-sage' : 'bg-line'}`} />
          ))}
        </div>
      </div>
    </header>
  );
}

/* ---------- Step 1 ---------- */
function SelectService({ selected, onSelect, onContinue }: { selected: ServiceDTO | null; onSelect: (s: ServiceDTO) => void; onContinue: () => void }) {
  const { data: services = [], isLoading, isError, refetch } = useQuery({ queryKey: ['services'], queryFn: api.services });
  const cats = CATEGORY_ORDER.filter((c) => services.some((s) => s.category === c));
  return (
    <>
      <div className="container-x flex-1 py-8">
        <h1 className="text-3xl font-semibold">Choose your service</h1>
        <p className="mt-2 text-text">Pick what suits you — you’ll choose your time next.</p>
        {isLoading && <p className="mt-8 text-muted">Loading services…</p>}
        {isError && (
          <div className="mt-8 rounded-md bg-[#FBEAE7] px-4 py-3 text-sm text-[#A23A2E]">
            We couldn’t load our services. <button onClick={() => refetch()} className="font-semibold underline">Try again</button> or call {STORE.phone}.
          </div>
        )}
        {cats.map((cat) => (
          <section key={cat} className="mt-8">
            <h2 className="mb-3 font-heading text-lg font-semibold text-ink">{cat} Massage</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.filter((s) => s.category === cat).map((s) => {
                const on = selected?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelect(s)}
                    className={`card flex flex-col gap-3 p-5 text-left transition ${on ? 'border-2 border-sage' : 'hover:border-sage'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="code-chip">{s.code} · {s.durationMinutes} min</span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-pill border-2 ${on ? 'border-sage bg-sage text-white' : 'border-line'}`}>
                        {on ? '✓' : ''}
                      </span>
                    </div>
                    <span className="font-heading text-base font-semibold text-ink">{s.description || s.category}</span>
                    <span className="font-heading text-xl font-semibold text-sage-deep">{usd(s.priceCents)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <StickyBar
        label={selected ? `${selected.description || selected.category} · ${selected.durationMinutes} min` : 'Select a service'}
        value={selected ? `${usd(selected.priceCents)}` : ''}
        disabled={!selected}
        cta="Continue to date & time"
        onClick={onContinue}
      />
    </>
  );
}

/* ---------- Step 2 ---------- */
function ctHour(iso: string) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: STUDIO_TZ, hour: '2-digit', hour12: false }).format(new Date(iso)));
}
function ctMinutes(iso: string) {
  const s = new Intl.DateTimeFormat('en-GB', { timeZone: STUDIO_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  return Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
}
const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
const dowOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const clockLabel = (m: number) => {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const sfx = h < 12 ? 'AM' : 'PM';
  return mm ? `${h12}:${String(mm).padStart(2, '0')} ${sfx}` : `${h12} ${sfx}`;
};

type BandState = 'avail' | 'unavail' | 'closed';

// Shared schedule math for both Gantt orientations: open/close window, contiguous
// Available/Unavailable/Closed bands, hour ticks, and nearest-slot picking.
function ganttModel(date: string, slots: SlotDTO[], service: ServiceDTO, selected: SlotDTO | null, reserveMin = 120) {
  const segs = WORKING_HOURS[dowOf(date)] ?? [];
  const availMins = slots.map((s) => ctMinutes(s.startAt));
  const availSet = new Set(availMins);
  const openMin = segs.length ? Math.min(...segs.map(([o]) => toMin(o))) : Math.min(...availMins);
  const closeMin = segs.length ? Math.max(...segs.map(([, c]) => toMin(c))) : Math.max(...availMins) + service.durationMinutes;
  const selMin = selected ? ctMinutes(selected.startAt) : null;
  const selEnd = selMin !== null ? selMin + service.durationMinutes : null;
  // Reserve past closing so a session that STARTS at/near close still renders fully.
  const chartEnd = Math.max(closeMin + reserveMin, selEnd ?? 0);
  const span = Math.max(chartEnd - openMin, 1);
  const stateAt = (m: number): BandState => (m >= closeMin ? 'closed' : availSet.has(m) ? 'avail' : 'unavail');

  // merge 15-min ticks into contiguous bands by state
  const bands: { start: number; end: number; state: BandState }[] = [];
  for (let m = openMin; m < chartEnd; m += 15) {
    const st = stateAt(m);
    const last = bands[bands.length - 1];
    if (last && last.state === st && last.end === m) last.end = m + 15;
    else bands.push({ start: m, end: m + 15, state: st });
  }

  const hourTicks: number[] = [];
  for (let m = Math.ceil(openMin / 60) * 60; m <= chartEnd; m += 60) hourTicks.push(m);

  const nearestSlot = (clicked: number): SlotDTO | null => {
    let best: SlotDTO | null = null;
    let bestD = Infinity;
    for (const s of slots) {
      const d = Math.abs(ctMinutes(s.startAt) - clicked);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  };

  return { openMin, closeMin, chartEnd, span, selMin, selEnd, bands, hourTicks, nearestSlot };
}

// Gantt-style day schedule (desktop) — matches the prototype: hour scale, a therapist
// lane, and labeled Available / Unavailable / Your-session bands.
function Gantt({ date, slots, service, selected, onSelect }: {
  date: string; slots: SlotDTO[]; service: ServiceDTO; selected: SlotDTO | null; onSelect: (s: SlotDTO) => void;
}) {
  const { openMin, closeMin, span, selMin, selEnd, bands, hourTicks, nearestSlot } = ganttModel(date, slots, service, selected);
  const pct = (m: number) => ((m - openMin) / span) * 100;
  const pickNearest = (clientX: number, rect: DOMRect) => {
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const s = nearestSlot(openMin + ratio * span);
    if (s) onSelect(s);
  };
  const dateIso = `${date}T12:00:00Z`; // header label from the day itself (works even when fully booked / no slots)

  return (
    <div className="mt-7">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-xl font-semibold text-ink">
          Anna’s schedule
          {dateIso && <span className="ml-2 font-body text-sm font-normal text-muted">{fmtDateLong(dateIso)}</span>}
        </h2>
        <Legend />
      </div>
      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-3 sm:grid-cols-[104px_minmax(0,1fr)]">
          {/* hour scale */}
          <div />
          <div className="relative mb-1 h-6">
            {hourTicks.map((m, idx) => (
              <div key={m} className="absolute top-0" style={{ left: `${pct(m)}%` }}>
                <span
                  className="block whitespace-nowrap text-[11px] font-medium text-muted"
                  style={idx === hourTicks.length - 1 ? { transform: 'translateX(-100%)' } : undefined}
                >
                  {clockLabel(m)}
                </span>
                <span className="mt-0.5 block h-1.5 w-px bg-line" />
              </div>
            ))}
          </div>

          {/* therapist label + lane */}
          <div className="flex flex-col justify-center pr-2">
            <p className="font-semibold text-ink">Anna</p>
            <p className="text-xs text-muted">{clockLabel(openMin)} – {clockLabel(closeMin)}</p>
          </div>
          <div
            className="relative isolate h-24 w-full cursor-pointer"
            onClick={(e) => pickNearest(e.clientX, e.currentTarget.getBoundingClientRect())}
          >
            {bands.map((b, i) => {
              const left = pct(b.start);
              const w = pct(b.end) - pct(b.start);
              const wide = w > 7;
              const style = { left: `calc(${left}% + 2px)`, width: `calc(${w}% - 4px)` };
              if (b.state === 'avail')
                return (
                  <div key={i} className="pointer-events-none absolute inset-y-0 flex items-center justify-center rounded-md bg-avail text-sm font-semibold text-sage-deep" style={style}>
                    {wide && 'Available'}
                  </div>
                );
              if (b.state === 'closed')
                return (
                  <div
                    key={i}
                    className="pointer-events-none absolute inset-y-0 flex items-center justify-center rounded-md text-xs text-muted"
                    style={{ ...style, backgroundColor: '#F0ECE0', backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(140,144,133,0.08) 5px, rgba(140,144,133,0.08) 10px)' }}
                  >
                    {wide && 'After hours'}
                  </div>
                );
              return (
                <div key={i} className="pointer-events-none absolute inset-y-0 flex items-center justify-center gap-1 rounded-md bg-unavail text-sm text-muted" style={style}>
                  {wide && <><span className="opacity-50">🔒</span><span>Unavailable</span></>}
                </div>
              );
            })}

            {/* closing-time marker — label sits to the LEFT of the line so it never collides with a near-closing session */}
            <div className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-dashed border-clay" style={{ left: `${pct(closeMin)}%` }}>
              <span className="absolute top-1 right-full mr-1 whitespace-nowrap rounded-sm bg-[#F0E6D9] px-1 text-[10px] font-semibold text-[#9A6E45]">
                Closes {clockLabel(closeMin)}
              </span>
            </div>

            {/* selected session — bar is the EXACT service duration; label runs vertically
                so it reads naturally inside a narrow block instead of overflowing sideways. */}
            {selMin !== null && selEnd !== null && selected && (
              <div
                className="pointer-events-none absolute inset-y-0 z-20 flex items-center justify-center overflow-hidden rounded-md bg-sage-deep shadow-[0_2px_12px_rgba(85,122,94,0.5)]"
                style={{ left: `calc(${pct(selMin)}% + 2px)`, width: `max(${pct(selEnd) - pct(selMin)}% - 4px, 20px)` }}
              >
                <span className="rotate-180 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-white [writing-mode:vertical-rl]">
                  Your session
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile schedule — vertical Gantt from the prototype: hour gutter on the left, a single
// day column whose blocks are sized by duration (60px/hour), tap a block to pick nearest.
function VerticalGantt({ date, slots, service, selected, onSelect }: {
  date: string; slots: SlotDTO[]; service: ServiceDTO; selected: SlotDTO | null; onSelect: (s: SlotDTO) => void;
}) {
  const PX = 1; // px per minute → 60px/hour, matching the prototype
  const { openMin, closeMin, span, selMin, selEnd, bands, hourTicks, nearestSlot } = ganttModel(date, slots, service, selected, 60);
  const yOf = (m: number) => (m - openMin) * PX;
  const totalH = span * PX;
  const dateIso = `${date}T12:00:00Z`; // header label from the day itself (works even when fully booked / no slots)
  const pickNearest = (clientY: number, rect: DOMRect) => {
    const ratio = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);
    const s = nearestSlot(openMin + ratio * span);
    if (s) onSelect(s);
  };

  return (
    <div className="mt-7">
      <h2 className="font-heading text-xl font-semibold text-ink">
        Anna’s day
        {dateIso && <span className="ml-2 font-body text-sm font-normal text-muted">{fmtDateLong(dateIso)}</span>}
      </h2>
      <div className="mt-2 mb-3"><Legend /></div>
      <div className="card p-3">
        <div className="flex gap-2" style={{ height: totalH }}>
          {/* hour gutter */}
          <div className="relative w-9 shrink-0">
            {hourTicks.map((m) => (
              <span
                key={m}
                className="absolute right-1 -translate-y-1/2 whitespace-nowrap text-[11px] font-medium text-muted"
                style={{ top: yOf(m) }}
              >
                {clockLabel(m)}
              </span>
            ))}
          </div>

          {/* day column */}
          <div
            className="relative isolate flex-1 cursor-pointer overflow-hidden rounded-md border border-line"
            onClick={(e) => pickNearest(e.clientY, e.currentTarget.getBoundingClientRect())}
          >
            {hourTicks.map((m) => (
              <span key={m} className="pointer-events-none absolute inset-x-0 border-t border-line/50" style={{ top: yOf(m) }} />
            ))}

            {bands.map((b, i) => {
              const h = (b.end - b.start) * PX;
              const tall = h >= 34;
              const style = { top: yOf(b.start) + 2, height: h - 4 };
              const base = 'pointer-events-none absolute inset-x-1 flex flex-col items-center justify-center rounded-md text-center';
              if (b.state === 'avail')
                return (
                  <div key={i} className={`${base} bg-avail`} style={style}>
                    {tall && <><span className="text-sm font-semibold text-sage-deep">Available</span><span className="text-[11px] font-medium text-sage-deep">tap a time below</span></>}
                  </div>
                );
              if (b.state === 'closed')
                return (
                  <div
                    key={i}
                    className={`${base} text-muted`}
                    style={{ ...style, backgroundColor: '#F0ECE0', backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(140,144,133,0.08) 5px, rgba(140,144,133,0.08) 10px)' }}
                  >
                    {tall && <span className="text-xs">After hours</span>}
                  </div>
                );
              return (
                <div key={i} className={`${base} bg-unavail text-muted`} style={style}>
                  {tall && <span className="flex items-center gap-1.5 text-sm font-semibold"><span className="opacity-50">🔒</span>Unavailable</span>}
                </div>
              );
            })}

            {/* closing-time marker */}
            <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-clay" style={{ top: yOf(closeMin) }}>
              <span className="absolute left-1 top-1 whitespace-nowrap rounded-sm bg-[#F0E6D9] px-1 text-[10px] font-semibold text-[#9A6E45]">
                Closes {clockLabel(closeMin)}
              </span>
            </div>

            {/* selected session — bar is the EXACT service duration; a floating pill
                carries the label so a short slot doesn't look longer than it is. */}
            {selMin !== null && selEnd !== null && selected && (
              <>
                <div
                  className="pointer-events-none absolute inset-x-1 z-20 rounded-md bg-sage-deep shadow-[0_2px_12px_rgba(85,122,94,0.5)]"
                  style={{ top: yOf(selMin) + 2, height: Math.max((selEnd - selMin) * PX - 4, 8) }}
                />
                <div
                  className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
                  style={{ top: yOf((selMin + selEnd) / 2) }}
                >
                  <span className="rounded-pill bg-white px-2 py-0.5 text-[11px] font-semibold text-sage-deep shadow-[0_1px_6px_rgba(40,48,39,0.25)]">
                    Your session · {fmtTime(selected.startAt)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend() {
  const item = (cls: string, label: string) => (
    <span className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded-sm ${cls}`} /> {label}</span>
  );
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
      {item('bg-avail', 'Available')}
      {item('bg-unavail border border-line', 'Unavailable')}
      {item('bg-sage-deep', 'Your session')}
    </div>
  );
}
function DateTime({ service, selected, conflict, onSelect, onContinue }: {
  service: ServiceDTO; selected: SlotDTO | null; conflict: boolean;
  onSelect: (s: SlotDTO) => void; onContinue: () => void;
}) {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['availability', service.id], queryFn: () => api.availability(service.id) });
  const days = useMemo(() => (data?.days ?? []).map((d) => ({ date: d.date, slots: d.therapists.flatMap((t) => t.slots) })), [data]);
  // Keep every OPEN day (studio works that weekday) in the strip — even a fully
  // booked one — so a booked-out day shows as "Full" instead of silently vanishing.
  // Closed days (no working hours) are still omitted.
  const openDays = useMemo(() => days.filter((d) => (WORKING_HOURS[dowOf(d.date)] ?? []).length > 0), [days]);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  // Default to the first day with real availability (don't land the user on a full
  // day); fall back to the first open day when everything is booked.
  const current = openDays.find((d) => d.date === activeDate) ?? openDays.find((d) => d.slots.length) ?? openDays[0];
  const dayFull = !!current && current.slots.length === 0;
  const dayAnchor = (d: string) => `${d}T12:00:00Z`; // noon-UTC → same CT calendar day for label formatting
  const selectedHere = current?.slots.find((s) => s.startAt === selected?.startAt) ?? null;

  const groups = useMemo(() => {
    const g: Record<string, SlotDTO[]> = { Morning: [], Afternoon: [], Evening: [] };
    for (const s of current?.slots ?? []) {
      const h = ctHour(s.startAt);
      (h < 12 ? g.Morning : h < 17 ? g.Afternoon : g.Evening).push(s);
    }
    return g;
  }, [current]);

  return (
    <>
      <div className="container-x flex-1 py-8">
        <h1 className="text-3xl font-semibold">Pick a date &amp; time</h1>
        <div className="mt-2 inline-flex items-center gap-2 rounded-pill bg-surface px-4 py-1.5 text-sm">
          <span className="code-chip">{service.code}</span>
          <span className="text-text">{service.description || service.category} · {service.durationMinutes} min · {usd(service.priceCents)}</span>
        </div>

        {/* Therapist */}
        <div className="mt-6 flex items-center gap-3 rounded-md border-2 border-sage bg-surface p-3">
          <img src="/images/therapist-anna.png" alt="Anna" className="h-12 w-12 rounded-pill object-cover" />
          <div>
            <p className="font-semibold text-ink">Anna</p>
            <p className="text-xs text-muted">Your therapist · more coming soon</p>
          </div>
        </div>

        {conflict && (
          <p className="mt-4 rounded-md bg-[#FBEAE7] px-4 py-3 text-sm font-medium text-[#A23A2E]">
            That time was just booked. Please choose another.
          </p>
        )}

        {isLoading ? (
          <p className="mt-8 text-muted">Loading availability…</p>
        ) : isError ? (
          <div className="mt-8 rounded-md bg-[#FBEAE7] px-4 py-3 text-sm text-[#A23A2E]">
            We couldn’t load open times. <button onClick={() => refetch()} className="font-semibold underline">Try again</button> or call {STORE.phone}.
          </div>
        ) : openDays.length === 0 ? (
          <p className="mt-8 text-muted">No open times in the next 30 days. Please call {STORE.phone}.</p>
        ) : (
          <>
            {/* date strip — open days only; fully-booked ones stay, marked "Full" */}
            <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
              {openDays.map((d) => {
                const on = (current?.date ?? '') === d.date;
                const full = d.slots.length === 0;
                return (
                  <button
                    key={d.date}
                    onClick={() => setActiveDate(d.date)}
                    className={`flex min-w-[64px] flex-col items-center rounded-md border px-3 py-2 ${on ? 'border-sage bg-sage text-white' : full ? 'border-line bg-bg text-muted' : 'border-line bg-surface text-text'}`}
                  >
                    <span className="text-xs">{fmtWeekday(dayAnchor(d.date))}</span>
                    <span className="text-lg font-semibold">{fmtDayNum(dayAnchor(d.date))}</span>
                    <span className={`h-3 text-[10px] font-semibold leading-3 ${on ? 'text-white/80' : 'text-muted'}`}>{full ? 'Full' : ''}</span>
                  </button>
                );
              })}
            </div>

            {/* gantt timeline — horizontal on desktop, vertical (prototype) on mobile */}
            {current && (
              <>
                <div className="hidden sm:block">
                  <Gantt date={current.date} slots={current.slots} service={service} selected={selectedHere} onSelect={onSelect} />
                </div>
                <div className="sm:hidden">
                  <VerticalGantt date={current.date} slots={current.slots} service={service} selected={selectedHere} onSelect={onSelect} />
                </div>
              </>
            )}

            {dayFull ? (
              <p className="mt-7 max-w-md rounded-md bg-[#F0ECE0] px-4 py-3 text-sm font-medium text-muted">
                Fully booked on this day — please pick another date{STORE.phone ? `, or call ${STORE.phone}` : ''}.
              </p>
            ) : (
              /* time select — pick the exact start time */
              <div className="mt-7 max-w-xs">
                <label htmlFor="time-select" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Choose a time
                </label>
                <div className="relative">
                  <select
                    id="time-select"
                    value={selected?.startAt ?? ''}
                    onChange={(e) => {
                      const s = (current?.slots ?? []).find((x) => x.startAt === e.target.value);
                      if (s) onSelect(s);
                    }}
                    className="w-full appearance-none rounded-sm border border-line bg-surface px-4 py-3 pr-10 text-sm font-medium text-ink outline-none focus:border-sage"
                  >
                    <option value="" disabled>Select a time…</option>
                    {Object.entries(groups).map(([period, slots]) =>
                      slots.length ? (
                        <optgroup key={period} label={period}>
                          {slots.map((s) => (
                            <option key={s.startAt} value={s.startAt}>{fmtTime(s.startAt)}</option>
                          ))}
                        </optgroup>
                      ) : null,
                    )}
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">▾</span>
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-muted">
                  Online bookings need at least 1 hour's notice, and times are spaced 30 minutes apart — a short buffer for any delay and to let your therapist rest between sessions. Need a same-hour or back-to-back booking? Call us at <a href={`tel:${STORE.phoneTel}`} className="font-semibold text-sage-deep">{STORE.phone}</a>.
                </p>
              </div>
            )}
          </>
        )}
      </div>
      <StickyBar
        label={selected ? `${fmtDateLong(selected.startAt)} · ${fmtTime(selected.startAt)}` : 'Select a time'}
        value={`${usd(service.priceCents)} · pay in person`}
        disabled={!selected}
        cta="Continue"
        onClick={onContinue}
      />
    </>
  );
}

/* ---------- Step 3 ---------- */
function YourDetails({ details, service, slot, onChange, onContinue }: {
  details: Details; service: ServiceDTO; slot: SlotDTO; onChange: (d: Details) => void; onContinue: () => void;
}) {
  const [ack, setAck] = useState(false);
  const valid = details.name.trim() && /\S+@\S+\.\S+/.test(details.email) && (details.phone.match(/\d/g)?.length ?? 0) >= 10 && ack;
  const set = (k: keyof Details, v: string) => onChange({ ...details, [k]: v });
  return (
    <>
      <div className="container-x grid flex-1 content-start gap-8 py-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-6">
          <h1 className="text-2xl font-semibold">Your details</h1>
          <div className="mt-5 space-y-4">
            <Field label="Full name" value={details.name} onChange={(v) => set('name', v)} placeholder="Jane Doe" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" value={details.phone} onChange={(v) => set('phone', v)} placeholder="(214) 555-0147" />
              <Field label="Email" value={details.email} onChange={(v) => set('email', v)} placeholder="jane@email.com" type="email" />
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Notes (optional)</span>
              <textarea
                value={details.note}
                onChange={(e) => set('note', e.target.value)}
                rows={3}
                placeholder="Anything we should know — areas of tension, pressure, pregnancy…"
                className="w-full rounded-sm border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-sage"
              />
            </label>
            <label className="flex items-start gap-3 text-sm text-text">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 h-4 w-4 accent-[#6B8F71]" />
              I understand I can cancel online up to 12 hours before my appointment, and payment is in person.
            </label>
          </div>
        </div>
        <Summary service={service} slot={slot} />
      </div>
      <StickyBar label="Your details" value="" disabled={!valid} cta="Continue to review" onClick={onContinue} />
    </>
  );
}

/* ---------- Step 4 ---------- */
function Confirm({ service, slot, details, onEdit, onConfirmed, onConflict }: {
  service: ServiceDTO; slot: SlotDTO; details: Details;
  onEdit: (s: number) => void; onConfirmed: (code: string) => void; onConflict: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setErr(null);
    const r = await api.createBooking({
      serviceId: service.id,
      startAt: slot.startAt,
      customerName: details.name,
      customerPhone: details.phone,
      customerEmail: details.email,
      customerNote: details.note || undefined,
    });
    setBusy(false);
    if (r.status === 201) onConfirmed(r.data.confirmationCode);
    else if (r.status === 409) onConflict();
    else setErr('Something went wrong. Please check your details and try again.');
  };
  return (
    <>
      <div className="container-x grid flex-1 content-start gap-8 py-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <ReviewCard title="Appointment" onEdit={() => onEdit(2)}>
            <Line k="Service" v={`${service.description || service.category} (${service.code})`} />
            <Line k="Duration" v={`${service.durationMinutes} min`} />
            <Line k="When" v={`${fmtDateLong(slot.startAt)} · ${fmtTime(slot.startAt)} CT`} />
            <Line k="Therapist" v="Anna" />
            <Line k="Location" v={STORE.addressLine} />
          </ReviewCard>
          <ReviewCard title="Your details" onEdit={() => onEdit(3)}>
            <Line k="Name" v={details.name} />
            <Line k="Phone" v={details.phone} />
            <Line k="Email" v={details.email} />
            {details.note && <Line k="Notes" v={details.note} />}
          </ReviewCard>
          <p className="rounded-md bg-[#EEF4EE] px-4 py-3 text-sm text-sage-deep">
            You can cancel online up to 12 hours before your appointment.
          </p>
        </div>
        <div className="card h-fit p-6">
          <p className="text-sm text-muted">Total</p>
          <p className="font-heading text-3xl font-semibold text-ink">{usd(service.priceCents)}</p>
          <p className="text-sm text-muted">pay in person</p>
          <ul className="mt-5 space-y-2 text-sm text-text">
            {['Pay in person — no deposit', 'Free cancellation (12h)', 'Email confirmation', 'No account needed'].map((t) => (
              <li key={t} className="flex gap-2"><span className="text-sage-deep">✓</span>{t}</li>
            ))}
          </ul>
          {err && <p className="mt-4 text-sm font-medium text-[#A23A2E]">{err}</p>}
          <button onClick={submit} disabled={busy} className="btn-primary mt-5 w-full disabled:opacity-60">
            {busy ? 'Confirming…' : 'Confirm booking'}
          </button>
          <p className="mt-3 text-center text-xs text-muted">By confirming you agree to our cancellation policy.</p>
        </div>
      </div>
    </>
  );
}

/* ---------- Step 5 ---------- */
function Success({ code, service, slot, name }: { code: string; service: ServiceDTO; slot: SlotDTO; name: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-line">
        <div className="container-x flex h-16 items-center"><Logo /></div>
      </header>
      <main className="container-x flex flex-1 flex-col items-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-pill bg-sage text-3xl text-white">✓</div>
        <p className="eyebrow mt-6">Booking confirmed</p>
        <h1 className="mt-2 text-3xl font-semibold">You’re all set{name ? `, ${name.split(' ')[0]}` : ''}.</h1>
        <p className="mt-2 text-text">We’ve emailed you a copy of the details.</p>

        <div className="mt-6 flex items-center gap-3 rounded-md border border-line bg-surface py-2 pl-5 pr-2">
          <span className="text-sm text-muted">Confirmation code</span>
          <span className="font-mono text-lg font-semibold tracking-wider text-ink">{code}</span>
          <CopyButton text={code} />
        </div>

        <div className="card mt-6 w-full max-w-md p-6 text-left">
          <Line k="Service" v={`${service.description || service.category} (${service.code})`} />
          <Line k="Duration" v={`${service.durationMinutes} min`} />
          <Line k="When" v={`${fmtDateLong(slot.startAt)} · ${fmtTime(slot.startAt)} CT`} />
          <Line k="Location" v={STORE.addressLine} />
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="text-sm text-muted">Total · pay in person</span>
            <span className="font-heading text-lg font-semibold text-ink">{usd(service.priceCents)}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/manage" className="btn-primary">Manage booking</Link>
          <Link to="/" className="btn-ghost">Back home</Link>
        </div>
      </main>
    </div>
  );
}

/* ---------- shared bits ---------- */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked (e.g. insecure context) — no-op */
    }
  };
  return (
    <button
      onClick={copy}
      aria-label={copied ? 'Copied' : 'Copy confirmation code'}
      title={copied ? 'Copied' : 'Copy'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-bg hover:text-sage-deep"
    >
      {copied ? <Check className="h-4 w-4 text-sage-deep" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
function StickyBar({ label, value, cta, disabled, onClick }: { label: string; value: string; cta: string; disabled?: boolean; onClick: () => void }) {
  return (
    <div className="sticky bottom-0 z-40 border-t border-line bg-surface shadow-[0_-5px_20px_rgba(40,48,39,0.06)]">
      <div className="container-x flex items-center justify-between gap-4 py-3.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{label}</p>
          {value && <p className="text-xs text-muted">{value}</p>}
        </div>
        <button onClick={onClick} disabled={disabled} className="btn-primary shrink-0 disabled:opacity-50">{cta}</button>
      </div>
    </div>
  );
}
function Summary({ service, slot }: { service: ServiceDTO; slot: SlotDTO }) {
  return (
    <div className="card h-fit p-6">
      <div className="flex items-center gap-3">
        <img src="/images/therapist-anna.png" alt="Anna" className="h-12 w-12 rounded-pill object-cover" />
        <div><p className="font-semibold text-ink">Anna</p><p className="text-xs text-muted">Your therapist</p></div>
      </div>
      <div className="mt-4 space-y-1 border-t border-line pt-4">
        <Line k="Service" v={`${service.description || service.category}`} />
        <Line k="Duration" v={`${service.durationMinutes} min`} />
        <Line k="When" v={`${fmtDateLong(slot.startAt)} · ${fmtTime(slot.startAt)}`} />
        <Line k="Location" v={STORE.addressLine} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="text-sm text-muted">Total · pay in person</span>
        <span className="font-heading text-lg font-semibold text-ink">{usd(service.priceCents)}</span>
      </div>
    </div>
  );
}
function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        <button onClick={onEdit} className="text-sm font-semibold text-sage-deep">Edit</button>
      </div>
      <div className="mt-3 space-y-1">{children}</div>
    </div>
  );
}
function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="shrink-0 text-muted">{k}</span>
      <span className="text-right font-medium text-ink">{v}</span>
    </div>
  );
}
function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-sm border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-sage"
      />
    </label>
  );
}
