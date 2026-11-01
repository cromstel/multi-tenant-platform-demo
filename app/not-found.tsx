import { NotFoundScreen } from '@/components/not-found-screen';

/**
 * Root 404 — unmatched URLs on the platform host.
 *
 * Deliberately free of request-time APIs (`headers`, `cookies`): a dynamic
 * call in a root boundary opts every route out of static prerendering. The
 * tenant-specific 404 lives in `app/s/[subdomain]/not-found.tsx`, where the
 * `Host` header is actually meaningful.
 */
export default function NotFound() {
  return <NotFoundScreen />;
}
