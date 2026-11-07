import Link from 'next/link';
import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { Users, Activity, Database } from 'lucide-react';
import { getTenantSession, logoutAction } from '@/app/auth/login/actions';
import { getMySQLPool } from '@/lib/db/mysql';
import { getSubdomainData } from '@/lib/subdomains';
import { protocol, rootDomain } from '@/lib/utils';

export const metadata: Metadata = {
  // No site-name suffix here — the root layout's `title.template` appends
  // it, and baking it in as well doubles it.
  title: 'Dashboard',
  description: 'Your tenant dashboard'
};

export default async function TenantDashboardPage({
  params
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  // Check authentication
  const session = await getTenantSession();
  if (!session) {
    redirect('/auth/login');
  }

  const pool = await getMySQLPool();

  // Verify this tenant matches the session
  if (session.tenantId) {
    const [rows] = await pool.execute(
      'SELECT subdomain FROM tenants WHERE id = ?',
      [session.tenantId]
    );
    const tenant = (rows as Array<{ subdomain: string }>)[0];
    if (!tenant || tenant.subdomain !== subdomain) {
      // If we can't verify, redirect to correct subdomain
      const correctSubdomain = tenant?.subdomain || subdomain;
      redirect(`${protocol}://${correctSubdomain}.${rootDomain}/dashboard`);
    }
  }

  const subdomainData = await getSubdomainData(subdomain);
  if (!subdomainData) {
    notFound();
  }

  // Real metrics from the database, not hardcoded mock values
  const [userCountResult] = await pool.execute(
    'SELECT COUNT(*) as count FROM tenant_users WHERE tenant_id = ? AND is_active = TRUE',
    [session.tenantId]
  );
  const userCount = Number((userCountResult as Array<{ count: number }>)[0]?.count) || 0;

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const [sessionCountResult] = await pool.execute(
    'SELECT COUNT(*) as count FROM tenant_sessions WHERE tenant_id = ? AND expires_at > ?',
    [session.tenantId, now]
  );
  const sessionCount = Number((sessionCountResult as Array<{ count: number }>)[0]?.count) || 0;

  return (
    <TenantDashboardLayout
      subdomain={subdomain}
      subdomainData={subdomainData}
      session={session}
    >
      <TenantDashboardContent
        subdomain={subdomain}
        userCount={userCount}
        sessionCount={sessionCount}
      />
    </TenantDashboardLayout>
  );
}

function TenantDashboardLayout({
  subdomain,
  subdomainData,
  session,
  children
}: {
  subdomain: string;
  subdomainData: { emoji: string; createdAt: number };
  session: { userId: number; tenantId: number; email: string; role: string };
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white">
      {/* Sidebar — collapses (hidden) on mobile, fixed on desktop */}
      <aside className="hidden lg:flex flex-shrink-0 w-64 border-r border-[#0078E2]/20 bg-white">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-[#0078E2]/20">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{subdomainData.emoji}</span>
              <span className="font-bold text-[#005cb3]">{subdomain}</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <Link
              href={`${protocol}://${subdomain}.${rootDomain}/dashboard`}
              className="flex items-center gap-3 px-3 py-2 rounded-none text-[#005cb3] hover:bg-[#0078E2]/10 hover:text-[#004A94] transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 001 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Dashboard
            </Link>
            <Link
              href={`${protocol}://${subdomain}.${rootDomain}/profile`}
              className="flex items-center gap-3 px-3 py-2 rounded-none text-[#005cb3] hover:bg-[#0078E2]/10 hover:text-[#004A94] transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Profile
            </Link>
            <Link
              href={`${protocol}://${subdomain}.${rootDomain}/settings`}
              className="flex items-center gap-3 px-3 py-2 rounded-none text-[#005cb3] hover:bg-[#0078E2]/10 hover:text-[#004A94] transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Settings
            </Link>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-[#0078E2]/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0078E2]/10 flex items-center justify-center">
                <span className="text-[#005cb3] text-sm font-medium">
                  {session.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#005cb3] truncate">{session.email}</p>
                <p className="text-xs text-slate-500">Member</p>
              </div>
            </div>
            <form action={logoutAction} className="mt-3">
              <button type="submit" className="w-full px-3 py-2 text-sm text-[#005cb3] hover:text-[#004A94] hover:bg-[#0078E2]/10 rounded-none transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content — full width, wide padding on large screens */}
      <main className="flex-1 w-full xl:px-12">
        <div className="px-4 lg:px-0 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function TenantDashboardContent({
  subdomain,
  userCount,
  sessionCount
}: {
  subdomain: string;
  userCount: number;
  sessionCount: number;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#005cb3]">Dashboard</h1>
        <p className="mt-1 text-slate-600">Welcome back! Here&apos;s an overview of your tenant.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Total Users" value={userCount} icon={<Users className="h-6 w-6" />} />
        <MetricCard title="Active Sessions" value={sessionCount} icon={<Activity className="h-6 w-6" />} />
        <MetricCard title="Storage Used" value="0 MB" icon={<Database className="h-6 w-6" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardWithTitle title="Recent Activity">
          <p className="text-slate-500 text-center py-8">No recent activity</p>
        </CardWithTitle>
        <CardWithTitle title="Quick Actions">
          <div className="space-y-3">
            <Link href={`${protocol}://${subdomain}.${rootDomain}/profile`} className="block p-4 border border-[#0078E2]/20 rounded-none hover:bg-[#0078E2]/10 transition-colors">
              <h3 className="font-medium text-[#005cb3]">Update Profile</h3>
              <p className="text-sm text-slate-500 mt-1">Manage your account settings</p>
            </Link>
            <Link href={`${protocol}://${subdomain}.${rootDomain}/settings`} className="block p-4 border border-[#0078E2]/20 rounded-none hover:bg-[#0078E2]/10 transition-colors">
              <h3 className="font-medium text-[#005cb3]">Tenant Settings</h3>
              <p className="text-sm text-slate-500 mt-1">Configure tenant preferences</p>
            </Link>
          </div>
        </CardWithTitle>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-none p-6 border border-[#0078E2]/20 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-[#005cb3] mt-1">{value}</p>
        </div>
        <div className="bg-[#0078E2]/10 p-3 rounded-none">
          {icon}
        </div>
      </div>
    </div>
  );
}

function CardWithTitle({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-none border border-[#0078E2]/20 shadow-sm">
      <div className="px-6 py-4 border-b border-[#0078E2]/20">
        <h3 className="text-lg font-semibold text-[#005cb3]">{title}</h3>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
