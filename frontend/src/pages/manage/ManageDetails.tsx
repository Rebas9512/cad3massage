import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import type { BookingDTO } from '@cad3/shared';
import { STORE } from '@cad3/shared';
import { api } from '../../lib/api';
import { fmtDateLong, fmtTime, usd } from '../../lib/format';

export function ManageDetails() {
  const loc = useLocation();
  const state = loc.state as { booking: BookingDTO } | null;
  const [booking, setBooking] = useState<BookingDTO | null>(state?.booking ?? null);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!state || !booking) return <Navigate to="/manage" replace />;

  const cancelled = booking.status === 'cancelled';
  const cancel = async () => {
    setBusy(true);
    setErr(null);
    const r = await api.cancel(booking.confirmationCode);
    setBusy(false);
    if (r.status === 200) { setBooking(r.data); setModal(false); }
    else if (r.status === 422) setErr('It’s within 12 hours of your appointment — please call us to cancel.');
    else setErr('Could not cancel. Please try again.');
  };

  return (
    <div className="container-x max-w-xl py-12">
      <h1 className="text-3xl font-semibold">Your appointment</h1>
      <div className="mt-2 inline-flex items-center gap-2 text-sm">
        <span className="text-muted">Code</span>
        <span className="font-mono font-semibold text-ink">{booking.confirmationCode}</span>
      </div>

      <div className="card mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">{booking.service.name || booking.service.code}</h2>
          <span className={`rounded-pill px-3 py-1 text-xs font-semibold ${cancelled ? 'bg-[#F1E2E0] text-[#A23A2E]' : 'bg-[#E7EEE7] text-sage-deep'}`}>
            {cancelled ? 'Cancelled' : 'Confirmed'}
          </span>
        </div>
        <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
          <Row k="When" v={`${fmtDateLong(booking.startAt)} · ${fmtTime(booking.startAt)} CT`} />
          <Row k="Therapist" v={booking.therapist.name} />
          <Row k="Location" v={STORE.addressLine} />
          <Row k="Total" v={`${usd(booking.service.priceCents)} · pay in person`} />
        </div>
      </div>

      {!cancelled && (
        <>
          <div className="mt-5 rounded-md bg-[#EEF4EE] px-4 py-3 text-sm text-sage-deep">
            You can still cancel online up to 12 hours before your appointment.
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE.addressLine)}`} target="_blank" rel="noreferrer" className="btn-ghost">Get directions</a>
            <button onClick={() => setModal(true)} className="btn border border-[#E2B4AC] bg-surface px-7 py-3 text-[#A23A2E] hover:bg-[#FBEAE7]">Cancel booking</button>
          </div>
          {err && <p className="mt-3 text-sm font-medium text-[#A23A2E]">{err}</p>}
        </>
      )}
      {cancelled && (
        <Link to="/book" className="btn-primary mt-6 inline-flex">Book another session</Link>
      )}

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-6" onClick={() => setModal(false)}>
          <div className="w-full max-w-sm rounded-lg bg-surface p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-xl font-semibold">Cancel this booking?</h3>
            <p className="mt-2 text-sm text-muted">This frees the time for someone else. You can always book again.</p>
            {err && <p className="mt-3 text-sm font-medium text-[#A23A2E]">{err}</p>}
            <div className="mt-5 flex flex-col gap-3">
              <button onClick={cancel} disabled={busy} className="btn bg-[#C0473A] px-7 py-3 text-white hover:bg-[#A23A2E] disabled:opacity-60">
                {busy ? 'Cancelling…' : 'Yes, cancel'}
              </button>
              <button onClick={() => setModal(false)} className="btn-ghost">Keep booking</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-muted">{k}</span>
      <span className="text-right font-medium text-ink">{v}</span>
    </div>
  );
}
