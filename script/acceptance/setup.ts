// Runs once per worker before any spec is collected. Probes the API so that
// suites can `describe.runIf(apiUp())` and cleanly SKIP when it isn't running.
import { ping, BASE_URL } from './helpers/api';

if (typeof (globalThis as any).__API_UP__ === 'undefined') {
  const up = await ping();
  (globalThis as any).__API_UP__ = up;
  if (!up) {
    // eslint-disable-next-line no-console
    console.warn(
      `\n⚠️  [acceptance] API not reachable at ${BASE_URL} — all API suites will be SKIPPED.\n` +
        `   Start the backend (e.g. \`wrangler dev\`) or set BASE_URL, then re-run.\n`,
    );
  }
}
