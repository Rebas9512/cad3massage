import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type WorkingHourRow } from '../../lib/api';
import { getToken } from '../../lib/auth';
import { useT, useLang, dayLabel } from '../../lib/i18n';

type Editable = { dayOfWeek: number; enabled: boolean; startTime: string; endTime: string };
const hm = (t: string) => (t ? t.slice(0, 5) : '');

export function WorkingHoursPage() {
  const token = getToken()!;
  const t = useT();
  const lang = useLang();
  const { data } = useQuery({ queryKey: ['working-hours'], queryFn: () => api.workingHours(token) });
  const [rows, setRows] = useState<Editable[]>([]);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setRows(
      Array.from({ length: 7 }, (_, dow) => {
        const found = data.find((r) => r.dayOfWeek === dow);
        return { dayOfWeek: dow, enabled: !!found, startTime: hm(found?.startTime ?? '10:00'), endTime: hm(found?.endTime ?? '22:00') };
      }),
    );
  }, [data]);

  const update = (dow: number, patch: Partial<Editable>) =>
    setRows((rs) => rs.map((r) => (r.dayOfWeek === dow ? { ...r, ...patch } : r)));

  const save = async () => {
    const hours: WorkingHourRow[] = rows
      .filter((r) => r.enabled)
      .map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: `${r.startTime}:00`, endTime: `${r.endTime}:00` }));
    setBusy(true);
    setErr(false);
    const r = await api.putWorkingHours(token, hours);
    setBusy(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setErr(true);
    }
  };

  return (
    <div className="p-5 sm:p-8">
      <h1 className="text-xl font-semibold">{t('wh.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('wh.sub')}</p>
      <div className="card mt-6 max-w-xl divide-y divide-line">
        {rows.map((r) => (
          <div key={r.dayOfWeek} className="flex flex-wrap items-center gap-3 p-4">
            <label className="flex w-28 items-center gap-2">
              <input type="checkbox" checked={r.enabled} onChange={(e) => update(r.dayOfWeek, { enabled: e.target.checked })} className="h-4 w-4 accent-[#6B8F71]" />
              <span className="font-medium text-ink">{dayLabel(r.dayOfWeek, lang)}</span>
            </label>
            {r.enabled ? (
              <div className="flex items-center gap-2">
                <input type="time" value={r.startTime} onChange={(e) => update(r.dayOfWeek, { startTime: e.target.value })} className="rounded-sm border border-line bg-bg px-2 py-1.5" />
                <span className="text-muted">–</span>
                <input type="time" value={r.endTime} onChange={(e) => update(r.dayOfWeek, { endTime: e.target.value })} className="rounded-sm border border-line bg-bg px-2 py-1.5" />
              </div>
            ) : (
              <span className="text-sm text-muted">{t('wh.closed')}</span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-60">{t('wh.save')}</button>
        {saved && <span className="text-sm font-medium text-sage-deep">{t('wh.saved')}</span>}
        {err && <span className="text-sm font-medium text-[#A23A2E]">{t('wh.saveerr')}</span>}
      </div>
    </div>
  );
}
