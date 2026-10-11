import { getAllSubdomains } from '@/lib/subdomains';
import type { Metadata } from 'next';
import { AdminDashboard } from './dashboard';
import { rootDomain } from '@/lib/utils';
import { requireAdmin } from '@/lib/auth';

export const metadata: Metadata = {
  title: `Admin Dashboard | ${rootDomain}`,
  description: `Manage subdomains for ${rootDomain}`
};

export default async function AdminPage() {
  // Unauthenticated visitors are redirected to the sign-in screen.
  //
  // This controls only which UI renders. The Server Action behind the delete
  // button re-checks independently — Server Actions are reachable by direct
  // POST, so this line alone would not protect the data.
  await requireAdmin();

  const tenants = await getAllSubdomains();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <AdminDashboard tenants={tenants} />
    </div>
  );
}