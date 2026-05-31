// Local dev uses node-postgres against the dockerized Postgres.
// Production (Cloudflare Workers) swaps this for drizzle-orm/neon-http — same
// query code, different driver. Kept behind this module so callers don't care.
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { ENV } from '../env.ts';
import { schema } from './schema.ts';

export const pool = new pg.Pool({ connectionString: ENV.DATABASE_URL });
export const db = drizzle(pool, { schema });
export type DB = typeof db;
