import { Redis } from '@upstash/redis';
import { hasUpstashCredentials, type KvClient } from '@/lib/kv-types';
import { createLocalStore } from '@/lib/local-store';

/**
 * Tenant data lives under `subdomain:{name}` keys.
 *
 * When Upstash credentials are present (production, preview deployments) the
 * real Redis client is used. Otherwise the app falls back to a local file-backed
 * store so `pnpm dev` works immediately after cloning, with no setup.
 */
export const redis: KvClient = hasUpstashCredentials()
  ? new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!
    })
  : createLocalStore();

export const storageDriver = hasUpstashCredentials() ? 'upstash' : 'local';