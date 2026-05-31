import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

export function ManageLookup() {
  const nav = useNavigate();
  // Email links land here as /manage?code=CAD3-XXXXX → prefill so it's one tap.
  const [params] = useSearchParams();
  const [code, setCode] = useState(() => (params.get('code') ?? '').trim().toUpperCase());
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await api.lookup(code.trim());
    setBusy(false);
    if (r.status === 200) nav('/manage/booking', { state: { booking: r.data } });
    else setErr('We couldn’t find a booking with that code. Please double-check it.');
  };

  return (
    <div className="container-x flex flex-col items-center py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-pill bg-[#E7EEE7] text-2xl">🎫</div>
      <h1 className="mt-5 text-3xl font-semibold">Find your booking</h1>
      <p className="mt-2 text-text">Enter the confirmation code from your booking email.</p>
      <form onSubmit={submit} className="card mt-8 w-full max-w-md space-y-4 p-6">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Confirmation code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="CAD3-XXXXX"
            autoFocus
            className="w-full rounded-sm border border-line bg-bg px-4 py-3 font-mono uppercase outline-none focus:border-sage"
          />
        </label>
        {err && <p className="text-sm font-medium text-[#A23A2E]">{err}</p>}
        <button disabled={busy || !code} className="btn-primary w-full disabled:opacity-50">
          {busy ? 'Searching…' : 'Find my booking'}
        </button>
      </form>
    </div>
  );
}
