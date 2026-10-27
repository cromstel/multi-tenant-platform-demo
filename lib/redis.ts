import { Redis } from '@upstash/redis';
import { hasUpstashCredentials, type KvClient } from '@/lib/kv-types';
import { createLocalStore } from '@/lib/local-store';
import { createMySQLStore } from '@/lib/db/mysql';

/**
 * The key/value store backing rate-limit counters and anything else that
 * needs a durable, shared counter.
 *
 * Three drivers, in priority order:
 *
 *  1. **Upstash Redis** — when `KV_REST_API_URL` and `KV_REST_API_TOKEN` are
 *     set. Used in production and on Vercel.
 *  2. **MySQL** — when `MYSQL_HOST` and `MYSQL_DATABASE` are set. Counters land
 *     in the `kv_store` table, so they are shared across every instance and
 *     survive a restart.
 *  3. **File store** — the fallback. Data lives in `.dev-store.json` on the
 *     local disk. Fine for a single developer machine, wrong for anything
 *     with more than one instance.
 */

const isProduction = process.env.NODE_ENV === 'production';

// `next build` also runs with NODE_ENV=production, but it never talks to the
// store — it only compiles and prerenders. Guarding here would break any CI
// pipeline that builds without production secrets injected, so the check is
// limited to real runtime.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

const hasMySQL = Boolean(process.env.MYSQL_HOST && process.env.MYSQL_DATABASE);

if (isProduction && !isBuildPhase && !hasUpstashCredentials() && !hasMySQL) {
  // Fail fast and loudly. Silently degrading to the local file store in
  // production would look like it works — every write landing in a throwaway
  // file that disappears on the next deploy.
  throw new Error(
    'A durable store is required in production. Set KV_REST_API_URL and ' +
      'KV_REST_API_TOKEN for Upstash Redis, or MYSQL_HOST and MYSQL_DATABASE ' +
      'to use the MySQL kv_store table. Refusing to start with the local ' +
      'development store, which is neither durable nor shared between ' +
      'instances. See .env.example.'
  );
}

export const redis: KvClient = hasUpstashCredentials()
  ? new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!
    })
  : hasMySQL
    ? createMySQLStore()
    : createLocalStore();

export const storageDriver = hasUpstashCredentials()
  ? 'upstash'
  : hasMySQL
    ? 'mysql'
    : 'local';
