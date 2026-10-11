import { Redis } from '@upstash/redis';
import { hasUpstashCredentials, type KvClient } from '@/lib/kv-types';
import { createLocalStore } from '@/lib/local-store';

/**
 * Tenant data lives under `subdomain:{name}` keys.
 *
 * When Upstash credentials are present (production, preview deployments) the
 * real Redis client is used. Otherwise the app falls back to a local
 * file-backed store so `pnpm dev` works immediately after cloning, with no
 * setup.
 */

const isProduction = process.env.NODE_ENV === 'production';

// `next build` also runs with NODE_ENV=production, but it never talks to the
// store — it only compiles and prerenders. Guarding here would break any CI
// pipeline that builds without production secrets injected, so the check is
// limited to real runtime.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

if (isProduction && !isBuildPhase && !hasUpstashCredentials()) {
  // Fail fast and loudly. Silently degrading to the local file store in
  // production would look like it works — every write landing in a throwaway
  // file that disappears on the next deploy.
  throw new Error(
    'KV_REST_API_URL and KV_REST_API_TOKEN must be set in production. ' +
      'Refusing to start with the local development store, which is not ' +
      'durable and is not shared between instances. See .env.example.'
  );
}

export const redis: KvClient = hasUpstashCredentials()
  ? new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!
    })
  : createLocalStore();

export const storageDriver = hasUpstashCredentials() ? 'upstash' : 'local';