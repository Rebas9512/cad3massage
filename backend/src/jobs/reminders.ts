// Local reminder runner: `npm -w @cad3/api run reminders`. Runs the same sweep
// the production Cloudflare Workers Cron Trigger will call on a schedule.
import { sendDueReminders } from '../services/email/reminders.ts';
import { emailProvider } from '../services/email/provider.ts';
import { pool } from '../db/index.ts';

const r = await sendDueReminders();
console.log(`✓ reminders (provider=${emailProvider.name}): considered=${r.considered} sent=${r.sent} failed=${r.failed} skipped=${r.skipped}`);
await pool.end();
