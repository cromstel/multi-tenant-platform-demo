import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getTenantSession } from '@/app/auth/login/actions';
import { getMySQLPool } from '@/lib/db/mysql';
import { getSubdomainData } from '@/lib/subdomains';
import { protocol, rootDomain } from '@/lib/utils';
import { ProfileForm } from './form';

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Your tenant profile'
};

export default async function TenantProfilePage({
  params
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  // Require a tenant session
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
      const correctSubdomain = tenant?.subdomain || subdomain;
      redirect(`${protocol}://${correctSubdomain}.${rootDomain}/profile`);
    }
  }

  const subdomainData = await getSubdomainData(subdomain);
  if (!subdomainData) {
    notFound();
  }

  // Load the signed-in user's profile from the database
  const [userRows] = await pool.execute(
    'SELECT email, role, created_at FROM tenant_users WHERE id = ? AND tenant_id = ? LIMIT 1',
    [session.userId, session.tenantId]
  );
  const user = (userRows as Array<{ email: string; role: string; created_at: Date }>)[0];
  if (!user) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#0078E2]/20 bg-white">
        <div className="w-full xl:px-12 mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-[#005cb3]">Profile</h1>
          <p className="mt-1 text-slate-600">Manage your account details.</p>
        </div>
      </header>

      <main className="w-full xl:px-12 mx-auto px-4 py-10">
        <ProfileForm user={user} />
      </main>
    </div>
  );
}
