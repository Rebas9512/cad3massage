import { Hono } from 'hono';
import { asc, eq } from 'drizzle-orm';
import { db } from '#db';
import { service } from '../db/schema.ts';
import { toServiceDTO } from '../lib/dto.ts';

export const services = new Hono();

services.get('/', async (c) => {
  const rows = await db.select().from(service).where(eq(service.isActive, true)).orderBy(asc(service.sortOrder));
  return c.json(rows.map(toServiceDTO));
});
