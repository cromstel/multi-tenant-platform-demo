import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * The test suite is deliberately untracked (see `.gitignore` — "do not track
 * test code"), so a fresh checkout has no `tests/` directory at all. Vitest
 * must not treat that as a failure: `pnpm test` runs in CI on every push, and
 * a missing suite is a normal state for this repository, not a broken one.
 *
 * When the suite is present these all behave exactly as before.
 */
const setupFile = path.resolve(rootDir, 'tests/setup.ts');
const serverOnlyStub = path.resolve(rootDir, 'tests/stubs/server-only.ts');
const hasTests = fs.existsSync(path.resolve(rootDir, 'tests'));

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
    setupFiles: hasTests && fs.existsSync(setupFile) ? [setupFile] : [],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**'],
    // The suite is untracked, so a checkout without it has nothing to run.
    // That is not a failure — see the note above.
    passWithNoTests: true,
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
      ...(fs.existsSync(serverOnlyStub) ? { 'server-only': serverOnlyStub } : {}),
    },
  },
});
