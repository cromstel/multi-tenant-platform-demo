import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest configuration.
 *
 * Two environments in one run:
 *
 *  - `node` for the pure-logic and database tests — the ones that exercise
 *    the real MySQL schema rather than a mock of it.
 *  - `jsdom` for the component tests.
 *
 * The default is `node` because most of the suite is server-side.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // The integration tests share one database, so they must not run
    // concurrently — they would race on the same rows.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'lib/**/*.{ts,tsx}',
        'app/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
      ],
      exclude: [
        'node_modules/**',
        '.next/**',
        'tests/**',
        '**/*.d.ts',
        'app/globals.css',
      ],
    },
  },
  resolve: {
    alias: {
      '@': rootDir,
      // `server-only` throws by design when it is imported outside a React
      // Server Component. In a test there is no such context, so it is
      // aliased to an empty module. The guard still does its job in the app.
      'server-only': path.resolve(rootDir, './tests/stubs/server-only.ts'),
    },
  },
});
