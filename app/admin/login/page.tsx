import { redirect } from 'next/navigation';

import { adminUrl } from '@/lib/admin-path';

/**
 * Legacy alias for the admin sign-in page.
 *
 * While `ADMIN_PATH` is set the proxy answers `/admin/login` with a 404 so
 * the internal path is never revealed. When it is not set, the sign-in page
 * lives at `/auth/admin/login` and this alias points there.
 */
export default function AdminRedirect() {
  redirect(adminUrl('/login'));
}

