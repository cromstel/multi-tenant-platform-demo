/**
 * Minimal key/value contract shared by the Upstash Redis client and the
 * local development store.
 *
 * Keeping the surface small means `lib/redis.ts` can swap implementations
 * without any caller (`lib/subdomains.ts`, `app/actions.ts`) having to change.
 */
export interface KvClient {
  /** Returns the stored value, or `null` when the key does not exist. */
  get<T>(key: string): Promise<T | null>;
  /** Stores a value and resolves with the backend's status reply. */
  set(key: string, value: unknown): Promise<unknown>;
  /** Deletes one or more keys and returns how many were removed. */
  del(...keys: string[]): Promise<number>;
  /** Lists keys matching a glob-style pattern, e.g. `subdomain:*`. */
  keys(pattern: string): Promise<string[]>;
  /** Reads several keys at once, preserving argument order. */
  mget<T>(...keys: string[]): Promise<(T | null)[]>;
}

/** True when real Upstash credentials are available. */
export function hasUpstashCredentials(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  );
}