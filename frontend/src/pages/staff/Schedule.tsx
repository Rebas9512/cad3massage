import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Plus, CalendarX, X, Check, UserX, CalendarClock, CircleX, Phone, Mail, Coffee, AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { STUDIO_TZ, WORKING_HOURS, type ServiceDTO, type SlotDTO } from '@cad3/shared';
import { api, type StaffBooking, type TimeOffRow } from '../../lib/api';
import { getToken } from '../../lib/auth';
import { fmtTime, usd } from '../../lib/format';
import { useT, useLang, type Lang } from '../../lib/i18n';
import { useLocateTarget, consumeLocate } from '../../lib/staffSearch';
import { staffPath } from '../../lib/host';

/* ---------- time helpers (studio tz) ---------- */
const ctDate = (d: Date | string) => new Intl.DateTimeFormat('en-CA', { timeZone: STUDIO_TZ }).format(new Date(d));
const ctMin = (iso: string) => {
  const s = new Intl.DateTimeFormat('en-GB', { timeZone: STUDIO_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  return Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
};
const shift = (d: string, n: number) => {
  const [y, m, dd] = d.split('-').map(Number);
  return ctDate(new Date(Date.UTC(y!, m! - 1, dd!, 12) + n * 86_400_000));
};
const dowOf = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();
const longDate = (d: string, lang: Lang = 'en') =>
  new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { timeZone: STUDIO_TZ, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${d}T12:00:00Z`));
const monthLabel = (d: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { timeZone: STUDIO_TZ, year: 'numeric', month: 'long' }).format(new Date(`${d}T12:00:00Z`));
const pad = (n: number) => String(n).padStart(2, '0');
const monthShift = (d: string, n: number) => {
  const [y, m, day] = d.split('-').map(Number);
  const idx = m! - 1 + n;
  const ny = y! + Math.floor(idx / 12);
  const mo = ((idx % 12) + 12) % 12;
  const dim = new Date(Date.UTC(ny, mo + 1, 0)).getUTCDate();
  return `${ny}-${pad(mo + 1)}-${pad(Math.min(day!, dim))}`;
};
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const clock = (m: number) => {
  const h = Math.floor(m / 60) % 24, mm = m % 60, h12 = h % 12 === 0 ? 12 : h % 12, sfx = h < 12 ? 'AM' : 'PM';
  return mm ? `${h12}:${String(mm).padStart(2, '0')} ${sfx}` : `${h12} ${sfx}`;
};

const STAT: Record<string, { bg: string; bar: string; badge: string; label: string; time: string }> = {
  confirmed: { bg: '#EAF1EA', bar: '#6B8F71', badge: 'bg-[#DCEBDD] text-sage-deep', label: 'Confirmed', time: 'text-sage-deep' },
  completed: { bg: '#EFEEE7', bar: '#9AA48F', badge: 'bg-[#E4E2D8] text-[#7C7A6C]', label: 'Completed', time: 'text-[#7C7A6C]' },
  no_show: { bg: '#F6EEE3', bar: '#C99A6A', badge: 'bg-[#F0E0CC] text-[#9C6B38]', label: 'No-show', time: 'text-[#9C6B38]' },
  cancelled: { bg: '#F4ECEC', bar: '#C0876F', badge: 'bg-[#F1E2E0] text-[#A23A2E]', label: 'Cancelled', time: 'text-[#A23A2E]' },
};
const stat = (s: string) => STAT[s] ?? STAT.confirmed!;

export function Schedule() {
  const token = getToken()!;
  const t = useT();
  const lang = useLang();
  const qc = useQueryClient();
  const [date, setDate] = useState(() => ctDate(new Date()));
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [selId, setSelId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [rescheduleFor, setRescheduleFor] = useState<StaffBooking | null>(null);

  // Header search → jump to a booking's day and open it.
  const locateTarget = useLocateTarget();
  useEffect(() => {
    if (locateTarget) { setDate(locateTarget.date); setView('day'); setSelId(locateTarget.id); consumeLocate(); }
  }, [locateTarget]);

  const { data: all = [], isLoading, isError, refetch } = useQuery({ queryKey: ['staff-bookings'], queryFn: () => api.staffBookings(token) });
  const { data: offs = [] } = useQuery({ queryKey: ['staff-time-off'], queryFn: () => api.timeOff(token) });
  const invalidate = () => { qc.invalidateQueries({ queryKey: ['staff-bookings'] }); qc.invalidateQueries({ queryKey: ['availability'] }); };

  const day = useMemo(() => all.filter((b) => ctDate(b.startAt) === date).sort((a, b) => a.startAt.localeCompare(b.startAt)), [all, date]);
  const selected = all.find((b) => b.id === selId) ?? null;
  const active = day.filter((b) => b.status !== 'cancelled');
  // Revenue counts only sessions that happened or are still on (no-shows didn't pay).
  const revenue = day
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((s, b) => s + b.service.priceCents, 0);

  const setStatus = async (id: string, status: string) => { await api.patchBooking(token, id, { status }); invalidate(); };
  const step = (dir: number) => setDate(view === 'month' ? monthShift(date, dir) : shift(date, view === 'week' ? dir * 7 : dir));

  return (
    <div className="flex h-full flex-col p-4 sm:p-6">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button onClick={() => step(-1)} aria-label={t('sch.prevday')} className="flex h-9 w-9 items-center justify-center rounded-sm border border-line bg-surface text-ink"><ChevronLeft className="h-[18px] w-[18px]" /></button>
            <h1 className="font-heading text-xl font-semibold text-ink sm:text-2xl">{view === 'month' ? monthLabel(date, lang) : longDate(date, lang)}</h1>
            <button onClick={() => step(1)} aria-label={t('sch.nextday')} className="flex h-9 w-9 items-center justify-center rounded-sm border border-line bg-surface text-ink"><ChevronRight className="h-[18px] w-[18px]" /></button>
            <button onClick={() => setDate(ctDate(new Date()))} className="rounded-pill border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink">{t('sch.today')}</button>
          </div>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-pill bg-sage px-5 py-2.5 text-sm font-semibold text-white">
            <Plus className="h-[18px] w-[18px]" /> {t('sch.newbooking')}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-0.5 rounded-pill bg-bg-alt p-0.5">
            {(['day', 'week', 'month'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-pill px-4 py-1.5 text-sm font-semibold ${view === v ? 'border border-line bg-surface text-ink' : 'text-muted'}`}>{t(`sch.${v}`)}</button>
            ))}
          </div>
          <Link to={staffPath('/time-off')} className="flex items-center gap-2 rounded-pill border-[1.5px] border-line px-4 py-2 text-sm font-semibold text-ink"><CalendarX className="h-4 w-4" /> {t('sch.timeoff')}</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat n={active.length} label={t('sch.appointments')} />
        <Stat n={day.filter((b) => b.status === 'completed').length} label={t('sch.completed')} />
        <Stat n={day.filter((b) => b.status === 'no_show').length} label={t('sch.noshow')} />
        <Stat n={usd(revenue)} label={t('sch.booked')} />
      </div>

      {/* Body */}
      <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
        {isLoading && <p className="rounded-md border border-dashed border-line p-10 text-center text-muted">{t('sch.loading')}</p>}
        {isError && (
          <div className="rounded-md border border-dashed border-line p-10 text-center">
            <p className="text-muted">{t('sch.loaderr')}</p>
            <button onClick={() => refetch()} className="btn-ghost mt-3 text-sm">{t('sch.retry')}</button>
          </div>
        )}
        {!isLoading && !isError && view === 'day' && (
          // Cancelled bookings are dropped from the Gantt entirely (DB record kept
          // for customer lookup / audit) — `active` excludes them, matching week/month.
          <DayGantt date={date} bookings={active} offs={offs} selId={selId} onSelect={setSelId} />
        )}
        {!isLoading && !isError && view === 'week' && (
          <WeekView all={all} date={date} onPick={(d) => { setDate(d); setView('day'); }} />
        )}
        {!isLoading && !isError && view === 'month' && (
          <MonthView all={all} date={date} onPick={(d) => { setDate(d); setView('day'); }} />
        )}
      </div>

      {selected && (
        <Detail
          b={selected}
          onClose={() => setSelId(null)}
          onStatus={setStatus}
          onReschedule={() => { setRescheduleFor(selected); }}
        />
      )}
      {showNew && <NewBooking token={token} onClose={() => setShowNew(false)} onCreated={(d) => { setShowNew(false); setDate(d); invalidate(); }} />}
      {rescheduleFor && (
        <Reschedule
          token={token}
          b={rescheduleFor}
          onClose={() => setRescheduleFor(null)}
          onDone={(d) => { setRescheduleFor(null); setSelId(null); setDate(d); invalidate(); }}
        />
      )}
    </div>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="rounded-md border border-line bg-surface px-4 py-3">
      <p className="font-heading text-xl font-semibold text-ink">{n}</p>
      <p className="text-xs font-medium text-muted">{label}</p>
    </div>
  );
}

/* Pack time-overlapping bookings into side-by-side columns so none is hidden
   (e.g. a session rescheduled onto a no-show that still occupies the slot). */
function packColumns(items: StaffBooking[]): Map<string, { col: number; cols: number }> {
  const sorted = [...items].sort((a, b) => ctMin(a.startAt) - ctMin(b.startAt) || ctMin(a.endAt) - ctMin(b.endAt));
  const out = new Map<string, { col: number; cols: number }>();
  let cluster: { id: string; col: number }[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = cluster.length ? Math.max(...cluster.map((x) => x.col)) + 1 : 1;
    for (const x of cluster) out.set(x.id, { col: x.col, cols });
    cluster = []; colEnds = []; clusterEnd = -1;
  };
  for (const b of sorted) {
    const s = ctMin(b.startAt), e = ctMin(b.endAt);
    if (cluster.length && s >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= s);
    if (col === -1) col = colEnds.length;
    colEnds[col] = e;
    cluster.push({ id: b.id, col });
    clusterEnd = Math.max(clusterEnd, e);
  }
  flush();
  return out;
}

/* ---------- vertical day Gantt ---------- */
function DayGantt({ date, bookings, offs, selId, onSelect }: {
  date: string; bookings: StaffBooking[]; offs: TimeOffRow[]; selId: string | null; onSelect: (id: string) => void;
}) {
  const t = useT();
  const segs = WORKING_HOURS[dowOf(date)] ?? [];
  const openMin = segs.length ? Math.min(...segs.map(([o]) => toMin(o))) : 600;
  const closeMin = segs.length ? Math.max(...segs.map(([, c]) => toMin(c))) : 1320;
  const dayOffs = offs.filter((o) => ctDate(o.startAt) === date);
  // Percentage layout: the timeline fills the available viewport height, so the
  // whole working day fits one screen on small devices AND stretches to fill big
  // ones (no whitespace). A minutes-floor keeps short appointments readable.
  const spanMin = Math.max(closeMin - openMin, 60);
  const pct = (m: number) => ((m - openMin) / spanMin) * 100;
  const hPct = (mins: number) => (Math.max(mins, 34) / spanMin) * 100;
  const hours: number[] = [];
  for (let m = Math.ceil(openMin / 60) * 60; m <= closeMin; m += 60) hours.push(m);
  const todayNow = ctDate(new Date()) === date ? ctMin(new Date().toISOString()) : null;
  const empty = !bookings.length && !dayOffs.length;
  const cols = packColumns(bookings);

  return (
    <div className="flex h-full flex-col rounded-lg border border-line bg-surface p-3 sm:p-4">
      {empty && <p className="mb-2 shrink-0 text-center text-sm text-muted">{t('sch.empty', { open: clock(openMin), close: clock(closeMin) })}</p>}
      <div className="flex min-h-0 flex-1 gap-2">
        <div className="relative w-12 shrink-0">
          {hours.map((m) => (
            <span key={m} className="absolute right-1.5 -translate-y-1/2 whitespace-nowrap text-[11px] font-medium text-muted" style={{ top: `${pct(m)}%` }}>{clock(m)}</span>
          ))}
        </div>
        <div className="relative isolate min-h-0 flex-1 border-l border-line">
          {hours.map((m) => <span key={m} className="pointer-events-none absolute inset-x-0 border-t border-line/50" style={{ top: `${pct(m)}%` }} />)}

          {dayOffs.map((o) => {
            const a = Math.max(ctMin(o.startAt), openMin), z = Math.min(ctMin(o.endAt), closeMin);
            return (
              <div key={o.id} className="pointer-events-none absolute inset-x-1 flex items-center justify-center gap-1.5 overflow-hidden rounded-md bg-[#ECEAE2] text-xs font-semibold text-muted" style={{ top: `${pct(a)}%`, height: `${hPct(z - a)}%` }}>
                <Coffee className="h-3.5 w-3.5" />{o.reason || 'Time off'}
              </div>
            );
          })}

          {bookings.map((b) => {
            const s = stat(b.status);
            const start = ctMin(b.startAt);
            const sel = selId === b.id;
            const flagged = (b.priorNoShowCount ?? 0) > 0;
            const lay = cols.get(b.id) ?? { col: 0, cols: 1 };
            return (
              <button
                key={b.id}
                onClick={() => onSelect(b.id)}
                className="absolute flex gap-2 overflow-hidden rounded-md text-left"
                style={{ top: `${pct(start)}%`, height: `${hPct(ctMin(b.endAt) - start)}%`, left: `calc(${(lay.col / lay.cols) * 100}% + 4px)`, width: `calc(${(1 / lay.cols) * 100}% - ${lay.cols > 1 ? 6 : 8}px)`, backgroundColor: s.bg, boxShadow: sel ? 'inset 0 0 0 2px #6B8F71' : 'inset 0 0 0 1px rgba(0,0,0,0.04)', zIndex: sel ? 6 : 1 }}
              >
                <span className="w-1 shrink-0" style={{ backgroundColor: s.bar }} />
                <span className="flex min-w-0 flex-1 flex-col justify-center py-1 pr-2 leading-tight">
                  <span className="flex items-center gap-1.5">
                    <span className="rounded-sm bg-white/70 px-1.5 py-px text-[10px] font-bold text-ink">{b.service.code}</span>
                    <span className={`truncate text-[12px] font-semibold ${s.time}`}>{fmtTime(b.startAt)}–{fmtTime(b.endAt)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    {flagged && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#9C6B38]" aria-label={t('sch.noshowflag')} />}
                    <span className="truncate font-heading text-[15px] font-semibold text-ink">{b.customerName}</span>
                  </span>
                </span>
              </button>
            );
          })}

          {todayNow !== null && todayNow >= openMin && todayNow <= closeMin && (
            <span className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-clay" style={{ top: `${pct(todayNow)}%` }}>
              <span className="absolute -left-0.5 -top-1 h-2 w-2 rounded-full bg-clay" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- week overview ---------- */
function WeekView({ all, date, onPick }: { all: StaffBooking[]; date: string; onPick: (d: string) => void }) {
  const t = useT();
  const lang = useLang();
  const start = shift(date, -dowOf(date));
  const days = Array.from({ length: 7 }, (_, i) => shift(start, i));
  const today = ctDate(new Date());
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {days.map((d) => {
        const items = all.filter((b) => ctDate(b.startAt) === d && b.status !== 'cancelled').sort((a, b) => a.startAt.localeCompare(b.startAt));
        return (
          <button key={d} onClick={() => onPick(d)} className={`rounded-md border bg-surface p-4 text-left transition hover:border-sage ${d === date ? 'border-sage ring-1 ring-sage' : 'border-line'}`}>
            <div className="flex items-center justify-between">
              <span className={`font-heading font-semibold ${d === today ? 'text-sage-deep' : 'text-ink'}`}>{longDate(d, lang)}{d === today ? ` · ${t('sch.today')}` : ''}</span>
              <span className="text-xs font-semibold text-muted">{t('sch.appts', { n: items.length })}</span>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {items.slice(0, 4).map((b) => (
                <span key={b.id} className="flex items-center gap-2 text-xs text-text">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: stat(b.status).bar }} />
                  <span className="font-medium">{fmtTime(b.startAt)}</span><span className="truncate text-muted">{b.customerName}</span>
                </span>
              ))}
              {items.length > 4 && <span className="text-xs text-muted">{t('sch.more', { n: items.length - 4 })}</span>}
              {!items.length && <span className="text-xs text-muted">—</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- month overview ---------- */
function MonthView({ all, date, onPick }: { all: StaffBooking[]; date: string; onPick: (d: string) => void }) {
  const t = useT();
  const lang = useLang();
  const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7));
  const first = `${y}-${pad(m)}-01`;
  const lead = dowOf(first);
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks = Math.ceil((lead + dim) / 7);
  const start = shift(first, -lead);
  const days = Array.from({ length: weeks * 7 }, (_, i) => shift(start, i));
  const today = ctDate(new Date());
  const dows = lang === 'zh' ? ['日', '一', '二', '三', '四', '五', '六'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="grid grid-cols-7 gap-1 pb-1.5 text-center text-xs font-semibold text-muted">
        {dows.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid flex-1 grid-cols-7 gap-1" style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}>
        {days.map((d) => {
          const inMonth = Number(d.slice(5, 7)) === m;
          const items = all.filter((b) => ctDate(b.startAt) === d && b.status !== 'cancelled');
          const isToday = d === today;
          return (
            <button
              key={d}
              onClick={() => onPick(d)}
              className={`flex flex-col gap-1 overflow-hidden rounded-md border p-1.5 text-left transition hover:border-sage ${d === date ? 'border-sage ring-1 ring-sage' : 'border-line'} ${inMonth ? 'bg-surface' : 'bg-bg-alt/40'}`}
            >
              <span className={`text-xs font-semibold ${isToday ? 'flex h-5 w-5 items-center justify-center rounded-pill bg-sage text-white' : inMonth ? 'text-ink' : 'text-muted'}`}>{Number(d.slice(8, 10))}</span>
              {items.length > 0 && (
                <span className="flex flex-wrap gap-0.5">
                  {items.slice(0, 5).map((b) => <span key={b.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stat(b.status).bar }} />)}
                </span>
              )}
              {items.length > 0 && <span className="mt-auto hidden text-[10px] font-semibold text-muted sm:block">{t('sch.appts', { n: items.length })}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- detail bottom sheet ---------- */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 sm:items-center" onClick={onClose}>
      <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-lg bg-surface p-6 shadow-[0_-8px_30px_rgba(40,48,39,0.18)] sm:max-w-md sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-ink">{title}</h2>
          <button onClick={onClose} aria-label={t('d.close')} className="flex h-8 w-8 items-center justify-center rounded-pill bg-bg text-muted"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel }: {
  title: string; body?: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={onCancel}>
      <div className="w-full max-w-xs rounded-lg bg-surface p-6 shadow-[0_12px_40px_rgba(40,48,39,0.25)]" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-heading text-lg font-semibold text-ink">{title}</h3>
        {body && <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>}
        <div className="mt-5 flex gap-2.5">
          <button onClick={onCancel} className="flex-1 rounded-pill border border-line py-2.5 text-sm font-semibold text-ink">{cancelLabel}</button>
          <button onClick={onConfirm} className="flex-1 rounded-pill bg-[#B5654B] py-2.5 text-sm font-semibold text-white">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function Detail({ b, onClose, onStatus, onReschedule }: {
  b: StaffBooking; onClose: () => void; onStatus: (id: string, s: string) => void; onReschedule: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const [confirming, setConfirming] = useState(false);
  const s = stat(b.status);
  return (
    <Sheet title={t('d.title')} onClose={onClose}>
      <div className="mt-3 flex items-center gap-2">
        <span className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${s.badge}`}>{t(`st.${b.status}`)}</span>
        <span className="text-sm text-muted">· {b.source === 'staff' ? t('d.staff') : t('d.online')}</span>
      </div>
      <h3 className="mt-3 font-heading text-xl font-semibold text-ink">{b.customerName}</h3>
      <div className="mt-3 flex flex-col gap-2 text-sm">
        {b.customerPhone && <span className="flex items-center gap-2 text-ink"><Phone className="h-4 w-4 text-sage-deep" /> {b.customerPhone}</span>}
        {b.customerEmail && <span className="flex items-center gap-2 text-ink"><Mail className="h-4 w-4 text-sage-deep" /> {b.customerEmail}</span>}
      </div>
      {(b.priorNoShowCount ?? 0) > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-[#F6EEE3] px-3 py-2 text-sm font-semibold text-[#9C6B38]">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {t('d.noshowflag', { n: b.priorNoShowCount! })}
        </div>
      )}
      <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="shrink-0 text-muted">{t('d.code')}</span>
          <span className="font-mono font-semibold tracking-wider text-ink">{b.confirmationCode}</span>
        </div>
        <Row k={t('d.service')} v={`${b.service.name || b.service.code} (${b.service.code})`} />
        <Row k={t('d.when')} v={longDate(ctDate(b.startAt), lang)} />
        <Row k={t('d.time')} v={`${fmtTime(b.startAt)} – ${fmtTime(b.endAt)} CT`} />
        <Row k={t('d.total')} v={`${usd(b.service.priceCents)} · ${t('d.payinperson')}`} />
      </div>
      {b.customerNote && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t('d.notes')}</p>
          <p className="mt-1 rounded-sm bg-bg p-3 text-sm leading-relaxed text-text">{b.customerNote}</p>
        </div>
      )}
      {b.status === 'confirmed' && (
        <div className="mt-5 space-y-2.5 border-t border-line pt-5">
          <button onClick={() => onStatus(b.id, 'completed')} className="flex w-full items-center justify-center gap-2 rounded-pill bg-sage px-4 py-3 text-sm font-semibold text-white"><Check className="h-[18px] w-[18px]" /> {t('d.complete')}</button>
          <div className="flex gap-2.5">
            <button onClick={onReschedule} className="flex flex-1 items-center justify-center gap-2 rounded-pill border-[1.5px] border-line py-3 text-sm font-semibold text-ink"><CalendarClock className="h-4 w-4" /> {t('d.reschedule')}</button>
            <button onClick={() => onStatus(b.id, 'no_show')} className="flex flex-1 items-center justify-center gap-2 rounded-pill border-[1.5px] border-line py-3 text-sm font-semibold text-ink"><UserX className="h-4 w-4" /> {t('d.noshow')}</button>
          </div>
          <button onClick={() => setConfirming(true)} className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-[#B5654B]"><CircleX className="h-4 w-4" /> {t('d.cancel')}</button>
        </div>
      )}
      {confirming && (
        <ConfirmDialog
          title={t('d.confirmcancel')}
          body={t('d.cancelbody')}
          confirmLabel={t('d.confirmyes')}
          cancelLabel={t('d.keep')}
          onCancel={() => setConfirming(false)}
          onConfirm={() => { setConfirming(false); onStatus(b.id, 'cancelled'); }}
        />
      )}
    </Sheet>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4"><span className="shrink-0 text-muted">{k}</span><span className="text-right font-medium text-ink">{v}</span></div>;
}

/* ---------- slot picker (shared by new + reschedule) ---------- */
function SlotPicker({ serviceId, value, onChange, excludeBookingId, noBuffer, noLead }: { serviceId: string; value: SlotDTO | null; onChange: (s: SlotDTO | null) => void; excludeBookingId?: string; noBuffer?: boolean; noLead?: boolean }) {
  const t = useT();
  const lang = useLang();
  const { data, isLoading } = useQuery({ queryKey: ['availability', serviceId, excludeBookingId ?? null, !!noBuffer, !!noLead], queryFn: () => api.availability(serviceId, undefined, excludeBookingId, noBuffer, noLead), enabled: !!serviceId });
  const days = useMemo(() => (data?.days ?? []).map((d) => ({ date: d.date, slots: d.therapists.flatMap((th) => th.slots) })), [data]);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  // Guard against silent day-jumps: days with no slots stay visible but disabled,
  // and we never auto-select a different day than today. If today has no slots,
  // staff must explicitly tap a date before any times are offered.
  const today = ctDate(new Date());
  const cur = activeDate ? days.find((d) => d.date === activeDate) : days.find((d) => d.date === today && d.slots.length > 0);

  if (isLoading) return <p className="text-sm text-muted">{t('sp.loading')}</p>;
  if (!days.some((d) => d.slots.length)) return <p className="text-sm text-muted">{t('sp.none')}</p>;
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => {
          const on = (cur?.date ?? '') === d.date;
          const label = lang === 'zh' ? `${Number(d.date.slice(5, 7))}月${Number(d.date.slice(8, 10))}日` : `${d.date.slice(5, 7)}/${d.date.slice(8, 10)}`;
          return (
            <button
              key={d.date}
              type="button"
              disabled={!d.slots.length}
              onClick={() => { if (d.date !== (cur?.date ?? '')) onChange(null); setActiveDate(d.date); }}
              className={`shrink-0 whitespace-nowrap rounded-md border px-3.5 py-2 text-sm font-medium ${on ? 'border-sage bg-sage text-white' : d.slots.length ? 'border-line bg-surface text-text' : 'cursor-not-allowed border-line bg-bg-alt/50 text-muted opacity-60'}`}
            >
              {d.date === today ? `${t('sch.today')} · ${label}` : label}
            </button>
          );
        })}
      </div>
      {cur && !cur.slots.length ? (
        <p className="text-sm text-muted">{t('sp.noneday')}</p>
      ) : (
        <select
          value={value?.startAt ?? ''}
          disabled={!cur}
          onChange={(e) => { const sl = cur?.slots.find((x) => x.startAt === e.target.value); if (sl) onChange(sl); }}
          className="w-full rounded-sm border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-sage disabled:opacity-60"
        >
          <option value="" disabled>{cur ? t('sp.selecttime') : t('sp.pickdate')}</option>
          {cur?.slots.map((sl) => <option key={sl.startAt} value={sl.startAt}>{fmtTime(sl.startAt)}</option>)}
        </select>
      )}
    </div>
  );
}

/* ---------- reschedule ---------- */
function Reschedule({ token, b, onClose, onDone }: { token: string; b: StaffBooking; onClose: () => void; onDone: (d: string) => void }) {
  const t = useT();
  const lang = useLang();
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: api.services });
  const [serviceId, setServiceId] = useState(b.service.id);
  const [slot, setSlot] = useState<SlotDTO | null>(null);
  // Preserve the booking's existing buffer policy: a back-to-back booking (occupied
  // up to end_at, no buffer) stays back-to-back unless staff changes it.
  const [noBuffer, setNoBuffer] = useState(!!b.occupiedUntil && b.occupiedUntil === b.endAt);
  const [noLead, setNoLead] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!slot) return;
    setBusy(true); setErr(null);
    const r = await api.patchBooking(token, b.id, { startAt: slot.startAt, serviceId, noBuffer });
    setBusy(false);
    if (r.status === 200) onDone(ctDate(slot.startAt));
    else if (r.status === 409) setErr(t('err.conflict'));
    else setErr(t('rs.err'));
  };
  return (
    <Sheet title={`${t('rs.title')} · ${b.customerName}`} onClose={onClose}>
      <p className="mt-2 text-sm text-muted">{t('rs.current', { svc: b.service.name || b.service.code, min: b.service.durationMinutes, when: `${longDate(ctDate(b.startAt), lang)} ${fmtTime(b.startAt)}` })}</p>
      <div className="mt-4 space-y-4">
        <Field label={t('nb.service')}>
          <select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setSlot(null); }} className="w-full rounded-sm border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-sage">
            {(services as ServiceDTO[]).map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name || s.category} · {s.durationMinutes}m · {usd(s.priceCents)}</option>)}
          </select>
        </Field>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-bg-alt/50 p-3">
          <input type="checkbox" checked={noBuffer} onChange={() => { setNoBuffer((v) => !v); setSlot(null); }} className="mt-0.5 h-4 w-4 shrink-0 accent-[#6B8F71]" />
          <span className="text-sm">
            <span className="font-semibold text-ink">{t('nb.b2b')}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted">{t('nb.b2bhint')}</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-bg-alt/50 p-3">
          <input type="checkbox" checked={noLead} onChange={() => { setNoLead((v) => !v); setSlot(null); }} className="mt-0.5 h-4 w-4 shrink-0 accent-[#6B8F71]" />
          <span className="text-sm">
            <span className="font-semibold text-ink">{t('nb.walkin')}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted">{t('nb.walkinhint')}</span>
          </span>
        </label>
        <Field label={t('nb.datetime')}><SlotPicker serviceId={serviceId} value={slot} onChange={setSlot} excludeBookingId={b.id} noBuffer={noBuffer} noLead={noLead} /></Field>
      </div>
      {err && <p className="mt-3 text-sm font-medium text-[#A23A2E]">{err}</p>}
      <button onClick={submit} disabled={!slot || busy} className="btn-primary mt-5 w-full disabled:opacity-50">{busy ? t('rs.saving') : t('rs.move')}</button>
    </Sheet>
  );
}

/* ---------- new booking (manual entry) ---------- */
function NewBooking({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: (d: string) => void }) {
  const t = useT();
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: api.services });
  const [serviceId, setServiceId] = useState('');
  const [slot, setSlot] = useState<SlotDTO | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [noBuffer, setNoBuffer] = useState(false);
  const [noLead, setNoLead] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const svc = services.find((s) => s.id === serviceId);

  const submit = async () => {
    if (!serviceId || !slot || !name.trim()) { setErr(t('nb.required')); return; }
    setBusy(true); setErr(null);
    const r = await api.staffCreateBooking(token, {
      serviceId, startAt: slot.startAt, customerName: name.trim(),
      customerPhone: phone.trim() || undefined, customerEmail: email.trim() || undefined, customerNote: note.trim() || undefined,
      noBuffer: noBuffer || undefined,
    });
    setBusy(false);
    if (r.status === 201) onCreated(ctDate(slot.startAt));
    else if (r.status === 409) setErr(t('err.conflict'));
    else setErr(t('err.create'));
  };

  return (
    <Sheet title={t('nb.title')} onClose={onClose}>
      <div className="mt-4 space-y-4">
        <Field label={t('nb.service')}>
          <select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setSlot(null); }} className="w-full rounded-sm border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-sage">
            <option value="" disabled>{t('nb.selectservice')}</option>
            {(services as ServiceDTO[]).map((s) => <option key={s.id} value={s.id}>{s.code} · {s.name || s.category} · {s.durationMinutes}m · {usd(s.priceCents)}</option>)}
          </select>
        </Field>
        {svc && (
          <>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-bg-alt/50 p-3">
              <input type="checkbox" checked={noBuffer} onChange={() => { setNoBuffer((v) => !v); setSlot(null); }} className="mt-0.5 h-4 w-4 shrink-0 accent-[#6B8F71]" />
              <span className="text-sm">
                <span className="font-semibold text-ink">{t('nb.b2b')}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{t('nb.b2bhint')}</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-bg-alt/50 p-3">
              <input type="checkbox" checked={noLead} onChange={() => { setNoLead((v) => !v); setSlot(null); }} className="mt-0.5 h-4 w-4 shrink-0 accent-[#6B8F71]" />
              <span className="text-sm">
                <span className="font-semibold text-ink">{t('nb.walkin')}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{t('nb.walkinhint')}</span>
              </span>
            </label>
            <Field label={t('nb.datetime')}><SlotPicker serviceId={serviceId} value={slot} onChange={setSlot} noBuffer={noBuffer} noLead={noLead} /></Field>
          </>
        )}
        <Field label={t('nb.name')}><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-sm border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-sage" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('nb.phone')}><input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-sm border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-sage" /></Field>
          <Field label={t('nb.email')}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-sm border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-sage" /></Field>
        </div>
        <Field label={t('nb.note')}><input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-sm border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-sage" /></Field>
        {err && <p className="text-sm font-medium text-[#A23A2E]">{err}</p>}
        <button onClick={submit} disabled={busy} className="btn-primary w-full disabled:opacity-60">{busy ? t('nb.creating') : t('nb.create')}</button>
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}
