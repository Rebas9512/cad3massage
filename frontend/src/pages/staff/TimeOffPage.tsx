import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Lock, X, Coffee, Plus } from 'lucide-react';
import { STUDIO_TZ, WORKING_HOURS } from '@cad3/shared';
import { api, type StaffBooking } from '../../lib/api';
import { getToken } from '../../lib/auth';
import { ctWallToInstant } from '../../lib/format';
import { useT, useLang, type Lang } from '../../lib/i18n';

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
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const clock = (m: number) => {
  const h = Math.floor(m / 60) % 24, mm = m % 60, h12 = h % 12 === 0 ? 12 : h % 12, sfx = h < 12 ? 'AM' : 'PM';
  return mm ? `${h12}:${String(mm).padStart(2, '0')} ${sfx}` : `${h12} ${sfx}`;
};
const longDate = (d: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { timeZone: STUDIO_TZ, weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${d}T12:00:00Z`));

type Sel = { start: number; end: number };

export function TimeOffPage() {
  const token = getToken()!;
  const t = useT();
  const lang = useLang();
  const qc = useQueryClient();
  const [date, setDate] = useState(() => ctDate(new Date()));
  const [sel, setSel] = useState<Sel | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: bookings = [] } = useQuery({ queryKey: ['staff-bookings'], queryFn: () => api.staffBookings(token) });
  const { data: offs = [] } = useQuery({ queryKey: ['time-off'], queryFn: () => api.timeOff(token) });

  const segs = WORKING_HOURS[dowOf(date)] ?? [];
  const open = segs.length ? Math.min(...segs.map(([o]) => toMin(o))) : 0;
  const close = segs.length ? Math.max(...segs.map(([, c]) => toMin(c))) : 0;
  const span = Math.max(close - open, 1);

  const booked = useMemo(
    () => bookings.filter((b) => ctDate(b.startAt) === date && b.status !== 'cancelled').map((b) => ({ a: ctMin(b.startAt), z: ctMin(b.endAt), name: b.customerName })),
    [bookings, date],
  );
  const dayOffs = useMemo(() => offs.filter((o) => ctDate(o.startAt) === date).map((o) => ({ id: o.id, a: ctMin(o.startAt), z: ctMin(o.endAt), reason: o.reason })), [offs, date]);

  // No overlap with bookings OR existing time off.
  const blocks = [...booked.map((b) => ({ a: b.a, z: b.z })), ...dayOffs.map((o) => ({ a: o.a, z: o.z }))];
  const overlaps = (a: number, z: number) => blocks.some((b) => a < b.z && b.a < z);
  const valid = !!sel && sel.start < sel.end && sel.start >= open && sel.end <= close && !overlaps(sel.start, sel.end);

  // --- drag-to-create / resize (Google-Calendar style) ---
  const laneRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ mode: 'create' | 'start' | 'end'; anchor: number } | null>(null);
  const minuteAt = (clientY: number) => {
    const r = laneRef.current!.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientY - r.top) / r.height, 0), 1);
    return Math.round((open + ratio * span) / 15) * 15;
  };
  const onLaneDown = (e: React.PointerEvent) => {
    if (!segs.length) return;
    const m = Math.max(open, Math.min(minuteAt(e.clientY), close - 15));
    drag.current = { mode: 'create', anchor: m };
    setErr(null);
    setSel({ start: m, end: Math.min(close, m + 60) });
    laneRef.current?.setPointerCapture(e.pointerId);
  };
  const onLaneMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const m = minuteAt(e.clientY);
    if (d.mode === 'create') {
      const lo = Math.max(open, Math.min(d.anchor, m));
      const hi = Math.min(close, Math.max(d.anchor + 15, Math.max(d.anchor, m)));
      setSel({ start: lo, end: hi });
    } else if (d.mode === 'end') {
      setSel((p) => (p ? { start: p.start, end: Math.min(close, Math.max(p.start + 15, m)) } : p));
    } else {
      setSel((p) => (p ? { start: Math.max(open, Math.min(p.end - 15, m)), end: p.end } : p));
    }
  };
  const onLaneUp = (e: React.PointerEvent) => {
    drag.current = null;
    try { laneRef.current?.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const onHandleDown = (mode: 'start' | 'end') => (e: React.PointerEvent) => {
    e.stopPropagation();
    drag.current = { mode, anchor: 0 };
    laneRef.current?.setPointerCapture(e.pointerId);
  };

  const add = async () => {
    if (!sel || !valid) { setErr(t('to.overlap')); return; }
    setBusy(true); setErr(null);
    const r = await api.addTimeOff(token, {
      startAt: ctWallToInstant(date, sel.start).toISOString(),
      endAt: ctWallToInstant(date, sel.end).toISOString(),
      reason: reason.trim() || undefined,
    });
    setBusy(false);
    if (r.status === 201) { setSel(null); setReason(''); qc.invalidateQueries({ queryKey: ['time-off'] }); qc.invalidateQueries({ queryKey: ['availability'] }); }
    else if (r.status === 409) setErr(t('to.overlap'));
    else setErr(t('to.invalid'));
  };
  const remove = async (id: string) => {
    await api.deleteTimeOff(token, id);
    qc.invalidateQueries({ queryKey: ['time-off'] });
    qc.invalidateQueries({ queryKey: ['availability'] });
  };

  const grid: number[] = [];
  for (let m = open; m <= close; m += 15) grid.push(m);
  const hours: number[] = [];
  for (let m = Math.ceil(open / 60) * 60; m <= close; m += 60) hours.push(m);
  const pct = (m: number) => ((m - open) / span) * 100;

  return (
    <div className="flex h-full flex-col p-4 sm:p-6">
      <div className="shrink-0">
        <h1 className="text-xl font-semibold">{t('to.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('to.subgantt')}</p>
      </div>

      <div className="mt-4 flex shrink-0 items-center gap-2.5">
        <button onClick={() => { setDate(shift(date, -1)); setSel(null); }} aria-label="prev" className="flex h-9 w-9 items-center justify-center rounded-sm border border-line bg-surface text-ink"><ChevronLeft className="h-[18px] w-[18px]" /></button>
        <h2 className="font-heading text-lg font-semibold text-ink">{longDate(date, lang)}</h2>
        <button onClick={() => { setDate(shift(date, 1)); setSel(null); }} aria-label="next" className="flex h-9 w-9 items-center justify-center rounded-sm border border-line bg-surface text-ink"><ChevronRight className="h-[18px] w-[18px]" /></button>
        <button onClick={() => { setDate(ctDate(new Date())); setSel(null); }} className="rounded-pill border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink">{t('sch.today')}</button>
      </div>

      {!segs.length ? (
        <p className="mt-6 rounded-md border border-dashed border-line p-10 text-center text-muted">{t('to.closed')}</p>
      ) : (
        <>
          <div className="mt-4 flex shrink-0 flex-wrap items-end gap-2.5">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t('to.start')}</span>
              <select value={sel?.start ?? ''} onChange={(e) => { const s = Number(e.target.value); setErr(null); setSel((p) => ({ start: s, end: Math.min(close, Math.max(p?.end ?? 0, s + 15)) })); }} className="rounded-sm border border-line bg-bg px-3 py-2 text-sm">
                <option value="" disabled>—</option>
                {grid.slice(0, -1).map((m) => <option key={m} value={m}>{clock(m)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t('to.end')}</span>
              <select value={sel?.end ?? ''} onChange={(e) => { const en = Number(e.target.value); setErr(null); setSel((p) => ({ start: Math.max(open, Math.min(p?.start ?? open, en - 15)), end: en })); }} className="rounded-sm border border-line bg-bg px-3 py-2 text-sm">
                <option value="" disabled>—</option>
                {grid.slice(1).map((m) => <option key={m} value={m}>{clock(m)}</option>)}
              </select>
            </label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('to.reason')} className="min-w-[140px] flex-1 rounded-sm border border-line bg-bg px-3 py-2 text-sm" />
            <button onClick={add} disabled={!valid || busy} className="flex items-center gap-2 rounded-pill bg-sage px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              <Plus className="h-[18px] w-[18px]" /> {t('to.add2')}
            </button>
          </div>
          {err && <p className="mt-2 shrink-0 text-sm font-medium text-[#A23A2E]">{err}</p>}

          <div className="mt-4 flex min-h-0 flex-1 rounded-lg border border-line bg-surface p-3 sm:p-4">
            <div className="flex min-h-0 flex-1 gap-2">
              <div className="relative w-12 shrink-0">
                {hours.map((m) => <span key={m} className="absolute right-1.5 -translate-y-1/2 whitespace-nowrap text-[11px] font-medium text-muted" style={{ top: `${pct(m)}%` }}>{clock(m)}</span>)}
              </div>
              <div
                ref={laneRef}
                onPointerDown={onLaneDown}
                onPointerMove={onLaneMove}
                onPointerUp={onLaneUp}
                className="relative isolate min-h-0 flex-1 cursor-crosshair touch-none border-l border-line"
              >
                {hours.map((m) => <span key={m} className="pointer-events-none absolute inset-x-0 border-t border-line/50" style={{ top: `${pct(m)}%` }} />)}

                {booked.map((b, i) => (
                  <div key={i} className="pointer-events-none absolute inset-x-1 flex items-center gap-1.5 overflow-hidden rounded-md bg-[#EDEBE3] px-2.5 text-xs font-semibold text-muted" style={{ top: `${pct(b.a)}%`, height: `${(Math.max(b.z - b.a, 20) / span) * 100}%` }}>
                    <Lock className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{t('to.booked')} · {b.name}</span>
                  </div>
                ))}

                {dayOffs.map((o) => (
                  <div key={o.id} className="pointer-events-none absolute inset-x-1 flex items-center justify-between gap-2 overflow-hidden rounded-md bg-[#E7E0D2] px-2.5 text-xs font-semibold text-[#8A6E45]" style={{ top: `${pct(o.a)}%`, height: `${(Math.max(o.z - o.a, 20) / span) * 100}%` }}>
                    <span className="flex min-w-0 items-center gap-1.5"><Coffee className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{o.reason || t('to.title')} · {clock(o.a)}–{clock(o.z)}</span></span>
                    <button onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(o.id)} aria-label={t('to.remove')} className="pointer-events-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-white/70 text-[#8A6E45] hover:bg-white"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}

                {sel && (
                  <div
                    className="absolute inset-x-1 overflow-hidden rounded-md"
                    style={{ top: `${pct(sel.start)}%`, height: `${(Math.max(sel.end - sel.start, 15) / span) * 100}%`, backgroundColor: valid ? 'rgba(85,122,94,0.9)' : 'rgba(176,71,58,0.75)', zIndex: 5 }}
                  >
                    <div onPointerDown={onHandleDown('start')} className="absolute inset-x-0 top-0 h-2.5 cursor-ns-resize" />
                    <div className="pointer-events-none flex h-full items-center justify-center px-2 text-center text-xs font-semibold text-white">
                      {t('to.newblock')} · {clock(sel.start)}–{clock(sel.end)}
                    </div>
                    <div onPointerDown={onHandleDown('end')} className="absolute inset-x-0 bottom-0 h-2.5 cursor-ns-resize" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
