// Block until the dockerized Postgres accepts connections.
import { execSync } from 'node:child_process';

const tries = 40;
for (let i = 1; i <= tries; i++) {
  try {
    execSync('docker exec cad3_db pg_isready -U cad3 -d cad3', { stdio: 'ignore' });
    console.log('✓ Postgres is ready');
    process.exit(0);
  } catch {
    process.stdout.write(`waiting for Postgres… (${i}/${tries})\r`);
    await new Promise((r) => setTimeout(r, 1000));
  }
}
console.error('\n✗ Postgres did not become ready in time');
process.exit(1);
