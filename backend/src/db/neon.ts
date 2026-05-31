// Production DB for Cloudflare Workers: Neon serverless Postgres over HTTP.
// Selected automatically for the `workerd` runtime via the "#db" subpath import
// (see package.json "imports"); local dev keeps node-postgres (./index.ts). Same
// drizzle query API, so callers (`import { db } from '#db'`) don't care.
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { ENV } from '../env.ts';
import { schema } from './schema.ts';

export const db = drizzle(neon(ENV.DATABASE_URL), { schema });
export type DB = typeof db;
