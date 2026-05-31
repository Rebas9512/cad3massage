// NOTIF — email notifications. See test plan §9.
// Email delivery + content + reminder timing are not black-box observable from
// the public API alone (no inbox / no public Notification read). These light up
// in Phase 4 via a staff/notifications inspection endpoint or a mailbox probe.
import { describe, it } from 'vitest';

describe('NOTIF — pending (Phase 4: needs notification log or mailbox probe)', () => {
  it.todo('NOTIF-01 on booking → customer confirmation + staff alert (Notification rows sent)');
  it.todo('NOTIF-02 on cancel → customer cancellation + staff alert');
  it.todo('NOTIF-03 reminder fires 2h before start (Cron Trigger)');
  it.todo('NOTIF-04 reminder idempotent (one per booking)');
  it.todo('NOTIF-05 cancelled bookings get no reminder');
  it.todo('NOTIF-06 provider failure does not block booking; row marked failed');
  it.todo('NOTIF-07 email body: store name, CT date/time, address, code, cancel link, phone');
  it.todo('NOTIF-08 real Resend delivery lands in inbox, not spam (manual; needs Q13 domain)');
});
