import { type NextRequest, NextResponse } from 'next/server';
import { rootDomain } from '@/lib/utils';

/**
 * Paths the admin area is mounted on internally.
 *
 * The public entry point is `ADMIN_PATH` (an unguessable segment from the
 * environment). Requests to the real routes are rejected with a 404 so the
 * internal path is never revealed, and requests to the public path are
 * rewritten onto the real routes.
 */
const ADMIN_INTERNAL_PREFIX = '/auth/admin';

/**
 * Paths that must never be reachable once `ADMIN_PATH` is set.
 *
 * `/auth/admin` and `/auth/admin/login` are the real routes — they are
 * answered with a 404 so the internal path is never revealed. `/admin` and
 * `/admin/login` are legacy aliases that used to redirect here; they are
 * hidden for the same reason.
 */
const ADMIN_HIDDEN_PREFIXES = ['/auth/admin', '/admin'];

function getAdminPath(): string | null {
  const configured = process.env.ADMIN_PATH?.trim();
  if (!configured) return null;
  // Normalise: no leading slash, no trailing slash, single segment.
  const cleaned = configured.replace(/^\/+|\/+$/g, '');
  if (!cleaned) return null;
  return cleaned;
}

function extractSubdomain(request: NextRequest): string | null {
  const url = request.url;
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];

  // Local development environment
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    // Try to extract subdomain from the full URL
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch && fullUrlMatch[1]) {
      return fullUrlMatch[1];
    }

    // Fallback to host header approach
    if (hostname.includes('.localhost')) {
      return hostname.split('.')[0];
    }

    return null;
  }

  // Production environment
  const rootDomainFormatted = rootDomain.split(':')[0];

  // Handle preview deployment URLs (tenant---branch-name.vercel.app)
  if (hostname.includes('---') && hostname.endsWith('.vercel.app')) {
    const parts = hostname.split('---');
    return parts.length > 0 ? parts[0] : null;
  }

  // Regular subdomain detection
  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, '') : null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const subdomain = extractSubdomain(request);
  const adminPath = getAdminPath();

  // ── Admin area gating ──────────────────────────────────────────────
  // The public path is rewritten onto the internal routes. The internal
  // routes themselves are answered with a 404 so the real path stays
  // unguessable — a redirect would hand it back.
  if (adminPath) {
    if (pathname === `/${adminPath}` || pathname.startsWith(`/${adminPath}/`)) {
      const rest = pathname.slice(`/${adminPath}`.length) || '';

      // The admin area is a single page, so a `/dashboard` suffix is an alias
      // for the dashboard itself rather than a separate route.
      const target = rest === '/dashboard' ? '' : rest;

      return NextResponse.rewrite(
        new URL(`${ADMIN_INTERNAL_PREFIX}${target}`, request.url)
      );
    }

    const isHidden = ADMIN_HIDDEN_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (isHidden) {
      // A bare `Not Found` string is not a valid HTML document — it has no
      // `lang` attribute and no `<title>`, which an accessibility audit
      // rightly complains about. A minimal document satisfies both without
      // revealing that an admin area exists.
      return new NextResponse(
        '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
          '<title>Not Found</title></head><body><h1>Not Found</h1></body></html>',
        {
          status: 404,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }
      );
    }
  }

  if (subdomain) {
    // Block access to admin page from subdomains
    if (pathname.startsWith('/admin') || pathname.startsWith(ADMIN_INTERNAL_PREFIX)) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Rewrite all tenant paths to the subdomain route
    if (pathname === '/' || pathname.startsWith('/dashboard')) {
      return NextResponse.rewrite(new URL(`/s/${subdomain}${pathname}`, request.url));
    }
  }

  // On the root domain, allow normal access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api|_next|[\\w-]+\\.\\w+).*)'
  ]
};
