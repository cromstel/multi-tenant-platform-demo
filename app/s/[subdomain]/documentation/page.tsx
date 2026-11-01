import type { Metadata } from 'next';
import { requireTenantSession } from '@/app/auth/login/actions';
import { getMySQLPool } from '@/lib/db/mysql';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'Documentation',
  robots: 'noindex, nofollow',
};

export default async function DocumentationPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const session = await requireTenantSession();
  const { subdomain } = await params;

  const pool = await getMySQLPool();

  // Validate user belongs to this subdomain
  const [userRows] = await pool.execute(
    'SELECT role FROM tenant_users WHERE id = ? AND tenant_id = (SELECT id FROM tenants WHERE subdomain = ?) AND is_active = TRUE',
    [session.userId, subdomain]
  );
  const user = (userRows as Array<{ role: string }>)[0];
  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-[#0c2238] text-white">
        <SiteHeader />
        <main className="flex flex-col items-center justify-center py-24">
          <h1 className="text-2xl font-semibold">Access denied</h1>
          <p className="text-gray-400">Your account is not linked to this workspace.</p>
        </main>
        <SiteFooter />
      </div>
    );
  }
  const role = user.role;

  const [docRows] = await pool.execute(
    'SELECT title, body FROM docs_sections WHERE role = ? ORDER BY sort_order ASC',
    [role]
  );
  const sections = (docRows as Array<{ title: string; body: string }>) || [];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#0f172a] to-[#0c2238] text-slate-100">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Documentation</h1>
          <p className="mt-3 text-lg text-blue-200/80">
            Welcome to <span className="font-semibold text-white">{subdomain}</span>. You are signed in as <span className="font-semibold text-white">{session.email}</span> with role <span className="font-semibold text-[#005cb3]">{role}</span>.
          </p>
        </div>

        <div className="space-y-8">
          {sections.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-blue-900/10">
              <p className="text-gray-300">No documentation sections are configured for your role yet.</p>
            </div>
          )}
          {sections.map((s, i) => (
            <article key={i} className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-blue-900/10 transition hover:border-[#0078E2]/40">
              <h2 className="text-2xl font-bold text-white">{s.title}</h2>
              <div className="mt-4 text-slate-200 leading-relaxed whitespace-pre-wrap">{s.body}</div>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
