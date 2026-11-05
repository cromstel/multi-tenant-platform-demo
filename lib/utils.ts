import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const protocol =
  process.env.NODE_ENV === 'production' ? 'https' : 'http';

/**
 * Host serving the landing page and admin panel, e.g. `localhost:3131`.
 *
 * The host *and* its port always come from the environment — no port is
 * hardcoded in source, so the same build runs on any port or on a real domain.
 *
 * Keep `NEXT_PUBLIC_ROOT_DOMAIN` in sync with the port the server listens on
 * (`PORT`). They cannot be derived from one another: browsers resolve
 * `*.localhost` to the loopback interface but read the port from the hostname
 * itself, so `acme.localhost` would land on :80, not on the dev server.
 */
const rootDomainEnv = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();

if (!rootDomainEnv) {
  console.warn(
    '[config] NEXT_PUBLIC_ROOT_DOMAIN is unset. Tenant links will fall back to ' +
      '`localhost`, which only resolves on port 80. Set it to the same host:port ' +
      'the app is served from (for example `localhost:3131`).'
  );
}

export const rootDomain = rootDomainEnv || 'localhost';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalises a subdomain to the characters allowed in a URL segment.
 * Lowercases and strips anything that isn't a lowercase letter, digit, or hyphen.
 */
export function sanitizeSubdomain(subdomain: string): string {
  return subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/**
 * Validates and normalises a subdomain.
 *
 * Calls `sanitizeSubdomain` and rejects values that are empty or that change
 * under sanitisation, so callers never silently accept a cleaned form. The
 * caller sees what they typed.
 */
export function validateSubdomain(subdomain: string): {
  ok: boolean;
  subdomain?: string;
  error?: string;
} {
  const sanitized = sanitizeSubdomain(subdomain);
  if (!sanitized || sanitized !== subdomain) {
    return { ok: false, error: 'Subdomain can only have lowercase letters, numbers, and hyphens.' };
  }
  return { ok: true, subdomain: sanitized };
}

/**
 * True when `error` is a Next.js redirect error thrown by `redirect()`.
 * Re-throwing these preserves navigation instead of swallowing them into a
 * generic error state.
 */
export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

/**
 * Turns a delay in seconds into a human-readable "X minute(s)" string,
 * always rounding up to at least one minute.
 */
export function minutesLabel(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export async function getTenantSessionSecret(): Promise<Uint8Array> {
  try {
    const secret = process.env.TENANT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('TENANT_SESSION_SECRET or ADMIN_SESSION_SECRET must be set (32+ chars)');
    }
    return new TextEncoder().encode(secret);
  } catch (error) {
    console.error('[auth] Failed to get tenant session secret:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}
