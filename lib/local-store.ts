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

/** Counter entries carry their own expiry, since a file has no TTL support. */
type Counter = { value: number; expiresAt: number | null };

const isCounter = (value: unknown): value is Counter =>
  typeof value === 'object' &&
  value !== null &&
  'value' in value &&
  typeof (value as Counter).value === 'number';

const DATA_FILE =
  process.env.LOCAL_KV_FILE || join(process.cwd(), '.dev-store.json');

// Survives dev-server reloads so reads and writes hit the same in-memory map.
const globalForStore = globalThis as unknown as {
  __localKvStore?: Store;
  /**
   * Serialises read-modify-write sequences. Node runs the event loop
   * single-threaded, so chaining promises is enough to make `incr` atomic
   * within this process — the same guarantee Redis gives across processes.
   */
  __localKvQueue?: Promise<unknown>;
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

/** Runs `task` after any previously queued mutation has settled. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const previous = globalForStore.__localKvQueue ?? Promise.resolve();
  const result = previous.then(task, task);
  // Keep the chain alive regardless of individual failures.
  globalForStore.__localKvQueue = result.catch(() => undefined);
  return result;
}

/** Reads a live counter, treating an expired one as absent. */
function readCounter(store: Store, key: string): Counter {
  const raw = store[key];
  if (isCounter(raw) && (raw.expiresAt === null || raw.expiresAt > Date.now())) {
    return raw;
  }
  return { value: 0, expiresAt: null };
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
      if (!(key in store)) return null;

      // Counters are an internal shape; never leak them to callers.
      if (isCounter(store[key])) {
        return readCounter(store, key).value as T;
      }

      return clone(store[key] as T);
    },

    async set(key: string, value: unknown): Promise<unknown> {
      return enqueue(async () => {
        const store = readStore();
        store[key] = clone(value);
        writeStore(store);
        return 'OK';
      });
    },

    async del(...keys: string[]): Promise<number> {
      return enqueue(async () => {
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
      });
    },

    async keys(pattern: string): Promise<string[]> {
      const store = readStore();
      const matcher = globToRegExp(pattern);
      return Object.keys(store).filter((key) => matcher.test(key));
    },

    async mget<T>(...keys: string[]): Promise<(T | null)[]> {
      const store = readStore();
      return keys.map((key) => {
        if (!(key in store)) return null;
        if (isCounter(store[key])) {
          return readCounter(store, key).value as T;
        }
        return clone(store[key] as T);
      });
    },

    async incr(key: string, by = 1): Promise<number> {
      return enqueue(async () => {
        const store = readStore();
        const current = readCounter(store, key);
        const next: Counter = {
          value: current.value + by,
          expiresAt: current.expiresAt
        };
        store[key] = next;
        writeStore(store);
        return next.value;
      });
    },

    async expire(key: string, seconds: number): Promise<unknown> {
      return enqueue(async () => {
        const store = readStore();
        const current = readCounter(store, key);
        // Redis returns 0 when the key does not exist; mirror that.
        if (current.value === 0) return 0;
        store[key] = { value: current.value, expiresAt: Date.now() + seconds * 1000 };
        writeStore(store);
        return 1;
      });
    }
  };
}