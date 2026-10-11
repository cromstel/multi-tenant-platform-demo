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
