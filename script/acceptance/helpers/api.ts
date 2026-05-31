// Low-level + domain helpers for the black-box acceptance harness.
// Everything goes through a configurable BASE_URL so the same suite runs
// against `wrangler dev`, a Neon-backed preview, or production.

// NOTE: do not use `BASE_URL` — Vite/Vitest reserves it (import.meta.env.BASE_URL='/')
// and mirrors it into process.env, which would clobber this. Use API_BASE_URL.
const RAW_BASE = process.env.API_BASE_URL?.trim() ? process.env.API_BASE_URL.trim() : 'http://127.0.0.1:8787';
export const BASE_URL = RAW_BASE.replace(/\/$/, '');
export const API = `${BASE_URL}/api`;

/** True only after setup.ts confirmed the API answered a health check. */
export const apiUp = (): boolean => (globalThis as any).__API_UP__ === true;

/** Probe health; tolerant of either `/health` or `/api/health`. */
export async function ping(): Promise<boolean> {
  for (const path of ['/health', '/api/health']) {
    try {
      const r = await fetch(BASE_URL + path, { signal: AbortSignal.timeout(1500) });
      if (r.ok) return true;
    } catch {
      /* unreachable — try next */
    }
  }
  return false;
}

export interface Res<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

export async function http(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Res> {
  const res = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed, headers: res.headers };
}

export const GET = (p: string, h?: Record<string, string>) => http('GET', p, undefined, h);
export const POST = (p: string, b?: unknown, h?: Record<string, string>) => http('POST', p, b, h);
export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

// ---- domain helpers -------------------------------------------------------

export async function listServices(): Promise<any[]> {
  const r = await GET('/services');
  return Array.isArray(r.body) ? r.body : [];
}

export async function serviceByCode(code: string): Promise<any | undefined> {
  return (await listServices()).find((s) => s.code === code);
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export async function availability(serviceId: string, days = 7): Promise<Res> {
  const from = ymd(new Date());
  const to = ymd(new Date(Date.now() + days * 86_400_000));
  return GET(`/availability?serviceId=${encodeURIComponent(serviceId)}&from=${from}&to=${to}`);
}

export function flattenSlots(availabilityBody: any): any[] {
  const out: any[] = [];
  for (const day of availabilityBody?.days ?? [])
    for (const t of day.therapists ?? []) for (const s of t.slots ?? []) out.push(s);
  return out;
}

/** Earliest slot at least `hours` in the future — far enough that cancel (>12h) works for cleanup. */
export async function slotAtLeastHoursAhead(serviceId: string, hours = 48): Promise<any | undefined> {
  const r = await availability(serviceId);
  const slots = flattenSlots(r.body)
    .filter((s) => new Date(s.startAt).getTime() >= Date.now() + hours * 3_600_000)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return slots[0];
}

export const sampleCustomer = (over: Record<string, unknown> = {}) => ({
  customerName: 'Acceptance Test',
  customerPhone: '(214) 555-0147',
  customerEmail: `acc+${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
  ...over,
});

export const createBooking = (payload: Record<string, unknown>) => POST('/bookings', payload);
export const lookup = (code: string) => GET(`/bookings/lookup?code=${encodeURIComponent(code)}`);
export const cancel = (code: string) => POST(`/bookings/${encodeURIComponent(code)}/cancel`, {});

export async function login(
  email = process.env.STAFF_EMAIL,
  password = process.env.STAFF_PASSWORD,
): Promise<Res | null> {
  if (!email || !password) return null;
  return POST('/auth/login', { email, password });
}

/** Minutes field of an ISO8601 string at its own offset (wall-clock minute). */
export const isoMinute = (iso: string): string => (iso.match(/T\d{2}:(\d{2})/)?.[1] ?? '');
