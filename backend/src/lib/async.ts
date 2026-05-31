import type { Context } from 'hono';

// Fire-and-forget background work (e.g. sending email) that must outlive the
// response. On Cloudflare Workers, async work not registered with
// executionCtx.waitUntil() is killed once the response returns — so register it
// there when available. On the Node adapter there is no ExecutionContext (the
// getter throws); the event loop keeps the promise alive on its own, so we just
// swallow errors and let it run.
export function runAfter(c: Context, work: Promise<unknown>): void {
  const safe = Promise.resolve(work).catch(() => {});
  try {
    c.executionCtx.waitUntil(safe);
  } catch {
    /* Node adapter: no executionCtx — the promise runs on the event loop. */
  }
}
