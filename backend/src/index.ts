import { serve } from '@hono/node-server';
import { app } from './app.ts';
import { ENV } from './env.ts';

serve({ fetch: app.fetch, port: ENV.API_PORT, hostname: '0.0.0.0' }, (info) => {
  console.log(`✓ CAD3 API on http://127.0.0.1:${info.port}  (tz=${ENV.STUDIO_TZ})`);
});
