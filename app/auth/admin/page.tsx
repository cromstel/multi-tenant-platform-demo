import type { Metadata } from 'next';

import { getAdminTenants, getAdminStats, getTenantDetails } from '@/lib/db/mysql';
import { AdminDashboard } from '@/app/admin/dashboard';
import { requireAdminSession } from '@/app/auth/admin/login/actions';

export const metadata: Metadata = {
  // No site-name suffix here — the root layout's `title.template` appends
  // it, and baking it in as well doubles it.
  title: 'Admin Dashboard',
  description: 'Manage tenants for CITGROUP TENANCY SYSTEM',
  // The admin area is not a public page — keep it out of search indexes.
  robots: { index: false, follow: false },
};

interface AdminPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

type SortBy = 'subdomain' | 'createdAt' | 'userCount';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE = 20;

export default async function AdminPage({ searchParams }: AdminPageProps) {
  // Require admin authentication
  await requireAdminSession();

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const search = params.search || '';
  const sortBy = (params.sortBy || 'createdAt') as SortBy;
  const sortOrder = (params.sortOrder || 'desc') as SortOrder;

  const [tenantsData, stats] = await Promise.all([
    getAdminTenants({ search, page, pageSize: PAGE_SIZE, sortBy, sortOrder }),
    getAdminStats(),
  ]);

  // Member lists for the detail modal. Fetched for the visible page only —
  // pulling every tenant's roster would be wasteful on a large instance.
  const detailEntries = await Promise.all(
    tenantsData.tenants.map(async (tenant) => {
      const detail = await getTenantDetails(tenant.subdomain);
      return detail ? ([tenant.subdomain, detail] as const) : null;
    })
  );

  const details = Object.fromEntries(
    detailEntries.filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminDashboard
        tenants={tenantsData.tenants}
        stats={stats}
        details={details}
        pagination={{
          page,
          totalPages: Math.max(1, Math.ceil(tenantsData.total / PAGE_SIZE)),
          total: tenantsData.total,
          search,
          sortBy,
          sortOrder,
        }}
      />
    </div>
  );
}

