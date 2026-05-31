// SEC — privacy / anti-enumeration / rate limiting. See test plan §12.
import { describe, it, expect } from 'vitest';
import { GET, apiUp, serviceByCode, availability, flattenSlots } from './helpers/api';

describe.runIf(apiUp())('SEC — privacy', () => {
  it('SEC-01 customer-facing availability exposes no PII', async () => {
    const svc = await serviceByCode('B2');
    const slots = flattenSlots((await availability(svc.id)).body);
    for (const s of slots) {
      for (const k of ['customerName', 'customerEmail', 'customerPhone', 'customer']) {
        expect(s).not.toHaveProperty(k);
      }
    }
  });

  it('SEC-03 lookup with an unknown code → 404 (no booking leaked)', async () => {
    const a = await GET('/bookings/lookup?code=CAD3-ZZZZZ');
    expect(a.status).toBe(404);
  });
});

describe('SEC — pending (careful / manual)', () => {
  it.todo('SEC-02 POST /bookings + lookup are rate-limited → 429 over threshold (CF rule/KV)');
  it.todo('SEC-04 only necessary PII collected; privacy page; deletion path (manual)');
});
