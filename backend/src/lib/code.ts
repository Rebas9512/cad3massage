// Confirmation code: CAD3-XXXXX, unambiguous alphabet (no 0/O/1/I/L).
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let s = '';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `CAD3-${s}`;
}
