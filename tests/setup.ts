import '@testing-library/jest-dom/vitest';
import { afterAll, beforeAll } from 'vitest';
import { closeMySQLPool } from '@/lib/db/mysql';

/**
 * Global test setup.
 *
 * The database pool is opened lazily by the code under test, so there is
 * nothing to prepare here — but it does have to be closed afterwards, or the
 * test process hangs on an open socket.
 */
beforeAll(() => {
  // The rate limiter and the session helpers read these. A test that exercises
  // them without them set would silently take the "unconfigured" branch.
  process.env.ADMIN_SESSION_SECRET ??=
    'test-only-admin-session-secret-at-least-32-characters-long';
  process.env.ADMIN_PASSWORD ??= 'test-admin-password';
  process.env.ADMIN_EMAIL ??= 'admin@test.local';
  process.env.MYSQL_HOST ??= 'localhost';
  process.env.MYSQL_PORT ??= '3306';
  process.env.MYSQL_USER ??= 'multi_tenant_admin';
  process.env.MYSQL_PASSWORD ??= 'April--2024!!!!';
  process.env.MYSQL_DATABASE ??= 'multi_tenant';
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ??= 'localhost:3030';
});

afterAll(async () => {
  await closeMySQLPool();
});
