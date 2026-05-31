// Applies migrations/*.sql in order, tracked in _migrations. Idempotent.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { ENV } from '../env.ts';

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(here, '../../migrations');

const client = new pg.Client({ connectionString: ENV.DATABASE_URL });
await client.connect();
await client.query(
  'CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
);

const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
for (const f of files) {
  const done = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [f]);
  if (done.rowCount) {
    console.log('skip   ', f);
    continue;
  }
  const sql = readFileSync(resolve(dir, f), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO _migrations(name) VALUES ($1)', [f]);
    await client.query('COMMIT');
    console.log('applied', f);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('failed ', f);
    throw e;
  }
}
await client.end();
console.log('✓ migrations up to date');
