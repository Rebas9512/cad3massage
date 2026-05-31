import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['acceptance/**/*.spec.ts'],
    setupFiles: ['acceptance/setup.ts'],
    reporters: 'verbose',
    testTimeout: 15000,
    hookTimeout: 15000,
    // Mutating suites share one live DB — run files serially so they don't
    // race for the same availability slot (the API correctly 409s a real race).
    fileParallelism: false,
  },
});
