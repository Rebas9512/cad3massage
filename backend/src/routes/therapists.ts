import { Hono } from 'hono';
import { asc, eq } from 'drizzle-orm';
import { db } from '#db';
import { staffMember } from '../db/schema.ts';
import { toTherapistDTO } from '../lib/dto.ts';

export const therapists = new Hono();

therapists.get('/', async (c) => {
  const rows = await db.select().from(staffMember).where(eq(staffMember.isActive, true)).orderBy(asc(staffMember.name));
  return c.json(rows.map(toTherapistDTO));
});
