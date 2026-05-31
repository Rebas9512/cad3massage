// PBKDF2 via WebCrypto — works on both Node and Cloudflare Workers (no native bcrypt).
import { timingSafeEqual } from 'node:crypto';

// Cloudflare Workers' WebCrypto caps PBKDF2 at 100,000 iterations — deriveBits
// throws above that on workerd, so this is the platform max (not the OWASP-ideal
// 600k). The count is stored per-hash, so re-seed any DB after changing it.
const ITERATIONS = 100_000;
const enc = new TextEncoder();
const b64 = (b: ArrayBuffer | Uint8Array) => Buffer.from(b instanceof Uint8Array ? b : new Uint8Array(b)).toString('base64');
const unb64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64'));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterStr, saltStr, hashStr] = stored.split('$');
  if (scheme !== 'pbkdf2' || !iterStr || !saltStr || !hashStr) return false;
  const computed = await derive(password, unb64(saltStr), Number(iterStr));
  const expected = unb64(hashStr);
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}
