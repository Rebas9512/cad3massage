// Cloudflare Workers entry. Reuses the same Hono app as local dev; adds the
// Cron handler that runs the reminder sweep. On Workers the DB is Neon (resolved
// via the "#db" → neon.ts subpath import for the workerd runtime); secrets/vars
// reach ENV through process.env (nodejs_compat). Local dev still uses src/index.ts
// (node-server + Docker Postgres) and never touches this file.
import { app } from './app.ts';
import { sendDueReminders } from './services/email/reminders.ts';

interface ScheduledCtx {
  waitUntil(p: Promise<unknown>): void;
}

export default {
  fetch: app.fetch,
  scheduled(_event: unknown, _env: unknown, ctx: ScheduledCtx): void {
    ctx.waitUntil(sendDueReminders());
  },
};
