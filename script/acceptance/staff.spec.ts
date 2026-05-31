// STAFF — schedule + management (deferred impl). See test plan §11.
// Most cases need an authenticated session; they light up once a seed staff
// account + STAFF_EMAIL/PASSWORD are available. Kept as todo until then.
import { describe, it } from 'vitest';

describe('STAFF — pending (deferred to Phase 3; needs auth token)', () => {
  it.todo('STAFF-01 GET /staff/bookings returns schedule incl. full customer contact');
  it.todo('STAFF-02 staff-created booking has source=staff and is conflict-checked');
  it.todo('STAFF-03 PATCH reschedule / status (completed/no_show/cancelled), re-checks conflict');
  it.todo('STAFF-04 PUT working-hours → immediately changes availability');
  it.todo('STAFF-05 POST time-off hides a segment; DELETE restores it');
  it.todo('STAFF-06 E2E on iPad: view day, open detail, mark completed');
});
