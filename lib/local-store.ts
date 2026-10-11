import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { KvClient } from '@/lib/kv-types';

/**
 * A dependency-free, file-backed key/value store used for local development
 * when `KV_REST_API_URL` / `KV_REST_API_TOKEN` are not configured.
 *
 * It implements only the subset of the Redis API this project uses, and it
 * persists to disk so data survives dev-server restarts and hot reloads.
 * Production and deployed preview environments always use Upstash Redis.
 */

type Store = Record<string, unknown>;

const DATA_FILE =
  process.env.LOCAL_KV_FILE || join(process.cwd(), '.dev-store.json');

// Survives dev-server reloads so reads and writes hit the same in-memory map.
const globalForStore = globalThis as unknown as {
  __localKvStore?: Store;
};

function readStore(): Store {
  if (globalForStore.__localKvStore) {
    return globalForStore.__localKvStore;
  }

  let loaded: Store = {};
  try {
    // turbopackIgnore: the path is developer-configurable via LOCAL_KV_FILE,
    // so it cannot be statically scoped. Tracing it would pull the whole
    // project into the server output.
    const raw = readFileSync(/* turbopackIgnore: true */ DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      loaded = parsed as Store;
    }
  } catch {
    // No file yet, or it is unreadable/corrupt — start from an empty store.
  }

  globalForStore.__localKvStore = loaded;
  return loaded;
}

function writeStore(store: Store): void {
  globalForStore.__localKvStore = store;
  try {
    mkdirSync(dirname(DATA_FILE), { recursive: true });
    writeFileSync(
      /* turbopackIgnore: true */ DATA_FILE,
      JSON.stringify(store, null, 2),
      'utf8'
    );
  } catch (error) {
    // Read-only filesystems should not take the app down.
    console.warn(`[local-kv] Could not persist ${DATA_FILE}:`, error);
  }
}

/**
 * Converts a Redis glob pattern (`subdomain:*`) into a RegExp.
 * Supports `*`, `?`, and character classes such as `[abc]`.
 */
function globToRegExp(pattern: string): RegExp {
  let source = '';
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '*') {
      source += '.*';
    } else if (char === '?') {
      source += '.';
    } else if (char === '[') {
      const end = pattern.indexOf(']', i + 1);
      if (end === -1) {
        source += '\\[';
      } else {
        source += pattern.slice(i, end + 1);
        i = end;
      }
    } else {
      source += char.replace(/[.+^${}()|\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${source}$`);
}

/**
 * Deep-clones a value on the way in and out so callers cannot mutate the
 * stored object by reference (matching Redis' serialisation semantics).
 */
function clone<T>(value: T): T {
  return structuredClone(value);
}

export function createLocalStore(): KvClient {
  return {
    async get<T>(key: string): Promise<T | null> {
      const store = readStore();
      return key in store ? clone(store[key] as T) : null;
    },

    async set(key: string, value: unknown): Promise<unknown> {
      const store = readStore();
      store[key] = clone(value);
      writeStore(store);
      return 'OK';
    },

    async del(...keys: string[]): Promise<number> {
      const store = readStore();
      let removed = 0;
      for (const key of keys) {
        if (key in store) {
          delete store[key];
          removed++;
        }
      }
      if (removed > 0) {
        writeStore(store);
      }
      return removed;
    },

    async keys(pattern: string): Promise<string[]> {
      const store = readStore();
      const matcher = globToRegExp(pattern);
      return Object.keys(store).filter((key) => matcher.test(key));
    },

    async mget<T>(...keys: string[]): Promise<(T | null)[]> {
      const store = readStore();
      return keys.map((key) =>
        key in store ? clone(store[key] as T) : null
      );
    }
  };
}