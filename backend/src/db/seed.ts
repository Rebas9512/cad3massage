// Idempotent reset + seed: 14 active services (+2 reserved), therapist Anna,
// her weekly working hours, and a staff login. Wipes bookings → deterministic.
import { SERVICE_CATALOG, WORKING_HOURS, serviceDisplayName } from '@cad3/shared';
import { db, pool } from './index.ts';
import { service, staffMember, workingHours } from './schema.ts';
import { hashPassword } from '../lib/password.ts';
import { ENV } from '../env.ts';

await pool.query(
  'TRUNCATE notification, booking, time_off, working_hours, service, staff_member RESTART IDENTITY CASCADE',
);

const [anna] = await db
  .insert(staffMember)
  .values({
    name: 'Anna',
    email: ENV.STAFF_EMAIL,
    passwordHash: await hashPassword(ENV.STAFF_PASSWORD),
    role: 'staff',
    bio: 'Licensed massage therapist bringing calm, focused, personalized bodywork to every session.',
    photoUrl: '/images/therapist-anna.png',
    isActive: true,
  })
  .returning();

await db.insert(service).values(
  SERVICE_CATALOG.map((s, i) => ({
    code: s.code,
    name: serviceDisplayName(s),
    category: s.category,
    description: s.description,
    durationMinutes: s.durationMinutes,
    bufferMinutes: 30,
    priceCents: s.priceCents,
    currency: 'USD',
    isActive: s.isActive,
    sortOrder: i,
  })),
);

const wh: Array<typeof workingHours.$inferInsert> = [];
for (const [dow, segs] of Object.entries(WORKING_HOURS)) {
  for (const [start, end] of segs) {
    wh.push({ therapistId: anna!.id, dayOfWeek: Number(dow), startTime: `${start}:00`, endTime: `${end}:00` });
  }
}
await db.insert(workingHours).values(wh);

console.log(`✓ seeded: Anna (${ENV.STAFF_EMAIL}), ${SERVICE_CATALOG.length} services, ${wh.length} working-hour rows`);
await pool.end();
