'use client';

import { useEffect, useMemo, useState } from 'react';
import { useActionState } from 'react';
import Link from 'next/link';
import {
  Trash2,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Building2,
  TrendingUp,
  X,
  Mail,
  Shield,
  Clock,
  Calendar,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { deleteSubdomainAction, bulkDeleteSubdomainsAction } from '@/app/actions';
import { MemberManager } from '@/app/admin/members/MemberManager';
import { listMembersAction } from '@/app/admin/members/actions';
import { logoutAction } from '@/app/auth/admin/login/actions';

type Tenant = {
  id: number;
  subdomain: string;
  emoji: string;
  createdAt: string | Date;
  userCount: number;
  ownerEmail: string | null;
};

type Stats = {
  totalTenants: number;
  totalUsers: number;
  activeTenants: number;
  recentTenants: number;
};

type Pagination = {
  page: number;
  totalPages: number;
  total: number;
  search: string;
  sortBy: string;
  sortOrder: string;
};

type DeleteState = {
  error?: string;
  success?: string;
};

type BulkDeleteState = {
  error?: string;
  success?: string;
  count?: number;
};

type TenantMember = {
  id: number;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string | Date;
  lastLoginAt: string | Date | null;
};

type TenantDetail = {
  tenant: Tenant;
  users: TenantMember[];
};

const PAGE_SIZE = 20;

function formatDate(value: string | Date | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value: string | Date | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatsCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-none bg-[#0078E2]/10 text-[#005cb3]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardHeader({ stats }: { stats: Stats }) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage tenants across CITGROUP TENANCY SYSTEM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-none px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Back to System
          </Link>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Tenants" value={stats.totalTenants} icon={Building2} />
        <StatsCard title="Active Tenants" value={stats.activeTenants} icon={Users} />
        <StatsCard title="Total Users" value={stats.totalUsers} icon={Users} />
        <StatsCard title="New (7 days)" value={stats.recentTenants} icon={TrendingUp} />
      </div>
    </>
  );
}

function SearchAndFilters({
  search,
  onSearch,
  sortBy,
  onSortBy,
  sortOrder,
  onSortOrder,
}: {
  search: string;
  onSearch: (value: string) => void;
  sortBy: string;
  onSortBy: (value: string) => void;
  sortOrder: string;
  onSortOrder: (value: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search tenants…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9"
          aria-label="Search tenants"
        />
      </div>

      <div className="flex gap-2">
        <select
          value={sortBy}
          onChange={(e) => onSortBy(e.target.value)}
          className="rounded-none border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#0078E2] focus:outline-none focus:ring-2 focus:ring-[#0078E2]/20"
          aria-label="Sort by"
        >
          <option value="createdAt">Created date</option>
          <option value="subdomain">Subdomain</option>
          <option value="userCount">User count</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => onSortOrder(e.target.value)}
          className="rounded-none border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#0078E2] focus:outline-none focus:ring-2 focus:ring-[#0078E2]/20"
          aria-label="Sort order"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
    </div>
  );
}

function TenantModal({
  detail,
  onClose,
}: {
  detail: TenantDetail | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!detail) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);
    // Prevent the page behind the modal from scrolling.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [detail, onClose]);

  if (!detail) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${detail.tenant.subdomain}`}
      onClick={onClose}
    >
      <div
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-none bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">
              {detail.tenant.emoji}
            </span>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                {detail.tenant.subdomain}
              </h2>
              <p className="text-sm text-slate-500">
                {detail.tenant.userCount} member{detail.tenant.userCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-none p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <dl className="grid grid-cols-2 gap-4">
            <div className="rounded-none bg-slate-50 p-3">
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                Created
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {formatDate(detail.tenant.createdAt)}
              </dd>
            </div>
            <div className="rounded-none bg-slate-50 p-3">
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Owner
              </dt>
              <dd className="mt-1 truncate text-sm font-medium text-slate-900">
                {detail.tenant.ownerEmail ?? '—'}
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-900">Team members</h3>
            {detail.users.length === 0 ? (
              <p className="rounded-none border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                No members yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-none border border-slate-200">
                {detail.users.map((user) => (
                  <li key={user.id} className="flex items-center gap-3 p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0078E2]/10 text-xs font-bold text-[#005cb3]">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{user.email}</p>
                      <p className="text-xs text-slate-500">
                        Joined {formatDate(user.createdAt)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                      <Shield className="h-3 w-3" aria-hidden="true" />
                      {user.role}
                    </span>
                    <span className="hidden text-xs text-slate-500 sm:inline">
                      <Clock className="mr-1 inline h-3 w-3" aria-hidden="true" />
                      {formatDateTime(user.lastLoginAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
          <a
            href={`/${detail.tenant.subdomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-none border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Visit tenant
          </a>
          <Button type="button" onClick={onClose} className="bg-[#005cb3] text-white hover:bg-[#004A94]">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard({
  tenants,
  stats,
  pagination,
  details,
}: {
  tenants: Tenant[];
  stats: Stats;
  pagination: Pagination;
  details: Record<string, TenantDetail>;
}) {
  const [search, setSearch] = useState(pagination.search);
  const [sortBy, setSortBy] = useState(pagination.sortBy);
  const [sortOrder, setSortOrder] = useState(pagination.sortOrder);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeTenant, setActiveTenant] = useState<string | null>(null);
  const [membersTenant, setMembersTenant] = useState<string | null>(null);
  const [members, setMembers] = useState<Array<{ id: number; email: string; role: string; isActive: boolean }>>([]);

  const [deleteState, deleteAction, isDeleting] = useActionState<DeleteState, FormData>(
    deleteSubdomainAction,
    {}
  );
  const [bulkState, bulkDeleteAction, bulkIsDeleting] = useActionState<BulkDeleteState, FormData>(
    bulkDeleteSubdomainsAction,
    {}
  );

  // Sync the URL when filters change so the view is shareable and survives a
  // refresh. `replaceState` avoids polluting the back-button history.
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder);
    if (pagination.page > 1) params.set('page', String(pagination.page));

    const query = params.toString();
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
  }, [search, sortBy, sortOrder, pagination.page]);

  const allSelected = useMemo(
    () => tenants.length > 0 && tenants.every((t) => selected.includes(t.subdomain)),
    [tenants, selected]
  );

  /** Loads a tenant's members and opens the member manager. */
  const openMembers = async (subdomain: string) => {
    const result = await listMembersAction(subdomain);
    if (result.members) {
      setMembers(result.members);
      setMembersTenant(subdomain);
    }
  };

  const toggleAll = () => {
    setSelected(allSelected ? [] : tenants.map((t) => t.subdomain));
  };

  const toggleOne = (subdomain: string) => {
    setSelected((prev) =>
      prev.includes(subdomain) ? prev.filter((s) => s !== subdomain) : [...prev, subdomain]
    );
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', String(page));
    window.location.search = params.toString();
  };

  const currentDetail = activeTenant ? details[activeTenant] ?? null : null;

  return (
    <div className="relative p-4 md:p-8">
      <DashboardHeader stats={stats} />

      <SearchAndFilters
        search={search}
        onSearch={setSearch}
        sortBy={sortBy}
        onSortBy={setSortBy}
        sortOrder={sortOrder}
        onSortOrder={setSortOrder}
      />

      {tenants.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-14 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-500" aria-hidden="true" />
            <p className="text-slate-500">
              {search ? 'No tenants match that search.' : 'No tenants have been created yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg">
                  Tenants ({pagination.total})
                </CardTitle>
                {selected.length > 0 && (
                  <form action={bulkDeleteAction}>
                    {selected.map((subdomain) => (
                      <input key={subdomain} type="hidden" name="subdomains" value={subdomain} />
                    ))}
                    <Button
                      type="submit"
                      variant="destructive"
                      size="sm"
                      disabled={bulkIsDeleting}
                    >
                      {bulkIsDeleting
                        ? 'Deleting…'
                        : `Delete ${selected.length} selected`}
                    </Button>
                  </form>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-y border-slate-100 bg-slate-50 text-left">
                      <th scope="col" className="w-10 px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          aria-label={allSelected ? 'Deselect all tenants' : 'Select all tenants'}
                          className="h-4 w-4 rounded border-slate-300 text-[#005cb3] focus:ring-[#0078E2]"
                        />
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Tenant
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Owner
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Created
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Users
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((tenant) => (
                      <tr
                        key={tenant.subdomain}
                        className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                          selected.includes(tenant.subdomain) ? 'bg-[#0078E2]/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(tenant.subdomain)}
                            onChange={() => toggleOne(tenant.subdomain)}
                            aria-label={`Select ${tenant.subdomain}`}
                            className="h-4 w-4 rounded border-slate-300 text-[#005cb3] focus:ring-[#0078E2]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setActiveTenant(tenant.subdomain)}
                            className="flex items-center gap-3 text-left"
                            aria-label={`View details for ${tenant.subdomain}`}
                          >
                            <span className="text-2xl" aria-hidden="true">
                              {tenant.emoji}
                            </span>
                            <span className="font-medium text-slate-900 underline-offset-2 hover:underline">
                              {tenant.subdomain}
                            </span>
                          </button>
                        </td>
                        <td className="max-w-[220px] truncate px-4 py-3 text-sm text-slate-600">
                          {tenant.ownerEmail ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(tenant.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#0078E2]/10 px-2 py-0.5 text-xs font-semibold text-[#005cb3]">
                            <Users className="h-3 w-3" aria-hidden="true" />
                            {tenant.userCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              onClick={() => openMembers(tenant.subdomain)}
                              aria-label={`Manage members of ${tenant.subdomain}`}
                              className="text-slate-500 transition-colors hover:bg-blue-50 hover:text-[#005cb3]"
                            >
                              <Users className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          <form action={deleteAction} className="inline">
                            <input type="hidden" name="subdomain" value={tenant.subdomain} />
                            <Button
                              variant="ghost"
                              size="icon"
                              type="submit"
                              disabled={isDeleting}
                              aria-label={`Delete ${tenant.subdomain}`}
                              className="text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              )}
                            </Button>
                          </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {pagination.totalPages > 1 && (
            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-slate-500">
                Showing {(pagination.page - 1) * PAGE_SIZE + 1}–
                {Math.min(pagination.page * PAGE_SIZE, pagination.total)} of{' '}
                {pagination.total} tenants
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <span className="px-2 text-sm text-slate-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <TenantModal detail={currentDetail} onClose={() => setActiveTenant(null)} />

      {membersTenant && (
        <MemberManager
          subdomain={membersTenant}
          members={members}
          onClose={() => setMembersTenant(null)}
        />
      )}

      {deleteState.error && (
        <div
          role="alert"
          className="fixed bottom-4 right-4 rounded-none border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg"
        >
          {deleteState.error}
        </div>
      )}

      {deleteState.success && (
        <div className="fixed bottom-4 right-4 rounded-none border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-lg">
          {deleteState.success}
        </div>
      )}

      {bulkState.error && (
        <div
          role="alert"
          className="fixed bottom-4 left-4 rounded-none border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg"
        >
          {bulkState.error}
        </div>
      )}

      {bulkState.success && (
        <div className="fixed bottom-4 left-4 rounded-none border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 shadow-lg">
          {bulkState.success}
        </div>
      )}
    </div>
  );
}
