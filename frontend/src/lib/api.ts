import type { AvailabilityResponse, BookingDTO, ServiceDTO, TherapistDTO } from '@cad3/shared';
import { clearToken } from './auth';
import { staffPath } from './host';

// API base is baked in at build time. `||` (not `??`) so an empty-string env var
// also falls back. In a production build the value MUST come from VITE_API_BASE
// (frontend/.env.production) — otherwise every call would hit localhost (and be
// blocked as mixed content on https), so we fail loud in the console.
const BASE = (import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787').replace(/\/$/, '');
if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE) {
  // eslint-disable-next-line no-console
  console.error('[api] VITE_API_BASE is not set for this production build — API calls will fail. Set it before building.');
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T;
}

async function request<T>(method: string, path: string, body?: unknown, token?: string): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // Network failure (offline, DNS, CORS, server unreachable). Never throw from
    // here: return a sentinel result so callers' status checks run, busy flags
    // reset, and queries surface isError instead of hanging on a stuck spinner.
    return { ok: false, status: 0, data: null as T };
  }
  // Persistent login: tokens don't expire, so a 401 on an authenticated call
  // means the token is invalid/revoked — clear it and bounce to login.
  if (res.status === 401 && token) {
    clearToken();
    const login = staffPath('/login');
    if (location.pathname !== login) location.assign(login);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data: data as T };
}

const unwrap = async <T>(p: Promise<ApiResult<T>>): Promise<T> => {
  const r = await p;
  if (!r.ok) throw Object.assign(new Error(`API ${r.status}`), { status: r.status, body: r.data });
  return r.data;
};

export const api = {
  services: () => unwrap(request<ServiceDTO[]>('GET', '/services')),
  therapists: () => unwrap(request<TherapistDTO[]>('GET', '/therapists')),
  availability: (serviceId: string, therapistId?: string, excludeBookingId?: string) =>
    unwrap(
      request<AvailabilityResponse>(
        'GET',
        `/availability?serviceId=${serviceId}${therapistId ? `&therapistId=${therapistId}` : ''}${excludeBookingId ? `&excludeBookingId=${excludeBookingId}` : ''}`,
      ),
    ),
  createBooking: (payload: Record<string, unknown>) => request<BookingDTO>('POST', '/bookings', payload),
  lookup: (code: string) => request<BookingDTO>('GET', `/bookings/lookup?code=${encodeURIComponent(code)}`),
  cancel: (code: string) => request<BookingDTO>('POST', `/bookings/${encodeURIComponent(code)}/cancel`, {}),

  // staff
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; staff: { id: string; name: string; email: string; role: string } }>(
      'POST',
      '/auth/login',
      { email, password },
    ),
  staffBookings: (token: string, from?: string, to?: string) =>
    unwrap(request<StaffBooking[]>('GET', `/staff/bookings${from && to ? `?from=${from}&to=${to}` : ''}`, undefined, token)),
  staffCreateBooking: (token: string, payload: Record<string, unknown>) =>
    request<BookingDTO>('POST', '/staff/bookings', payload, token),
  patchBooking: (token: string, id: string, patch: Record<string, unknown>) =>
    request<BookingDTO>('PATCH', `/staff/bookings/${id}`, patch, token),
  workingHours: (token: string) => unwrap(request<WorkingHourRow[]>('GET', '/staff/working-hours', undefined, token)),
  putWorkingHours: (token: string, hours: WorkingHourRow[]) => request('PUT', '/staff/working-hours', { hours }, token),
  timeOff: (token: string) => unwrap(request<TimeOffRow[]>('GET', '/staff/time-off', undefined, token)),
  addTimeOff: (token: string, payload: { startAt: string; endAt: string; reason?: string }) =>
    request('POST', '/staff/time-off', payload, token),
  deleteTimeOff: (token: string, id: string) => request('DELETE', `/staff/time-off/${id}`, undefined, token),
};

export interface StaffBooking {
  id: string;
  confirmationCode: string;
  status: string;
  startAt: string;
  endAt: string;
  service: { id: string; code: string; name: string; durationMinutes: number; priceCents: number };
  therapist: { id: string; name: string };
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNote: string | null;
  source: string;
}
export interface WorkingHourRow {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}
export interface TimeOffRow {
  id: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}
