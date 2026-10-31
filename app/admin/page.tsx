import { redirect } from 'next/navigation';

import { adminUrl } from '@/lib/admin-path';

/**
 * Legacy alias for the admin area.
 *
 * While `ADMIN_PATH` is set the proxy answers `/admin` with a 404 so the
 * internal path is never revealed. When it is not set, the area lives at
 * `/auth/admin` and this alias points there.
 */
export default function AdminRedirect() {
  redirect(adminUrl());
}

