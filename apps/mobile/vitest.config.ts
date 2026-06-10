import { defineConfig } from 'vitest/config';

// Pure-TS unit tests only (src/**/*.test.ts, never .tsx) - no React Native runtime needed.
export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
