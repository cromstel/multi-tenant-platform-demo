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
  const [userRows] = (await pool.execute(
    'SELECT role FROM tenant_users WHERE id = ? AND tenant_id = ? AND is_active = TRUE LIMIT 1',
    [session.userId, session.tenantId]
  )) as [Array<{ role: string }>, unknown];

  if (userRows.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center p-8 bg-white border border-gray-200 shadow-sm rounded-none">
            <h1 className="text-2xl font-bold text-[#005cb3] mb-2">Access Denied</h1>
            <p className="text-gray-600">Your account is not active for this tenant.</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const role = userRows[0].role;
  const [docRows] = (await pool.execute(
    'SELECT * FROM docs_sections WHERE role = ? ORDER BY sort_order ASC',
    [role]
  )) as [Array<{ id: number; role: string; title: string; body: string; sort_order: number }>, unknown];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-blue-50 to-white">
      <SiteHeader />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <span className="inline-block rounded-full bg-[#0078E2]/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase text-[#005cb3] border border-[#0078E2]/20">
              {subdomain}
            </span>
            <span className="inline-block rounded-full bg-[#0078E2]/10 px-3 py-1 text-xs font-semibold tracking-wide uppercase text-[#005cb3] border border-[#0078E2]/20">
              Role: {role}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
            Documentation
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl">
            Tiered guides and reference material for <span className="font-semibold text-[#005cb3]">{subdomain}</span>. Content is filtered by your assigned role.
          </p>

          {docRows.length === 0 ? (
            <div className="p-8 bg-white border border-gray-200 shadow-sm rounded-none">
              <p className="text-gray-500">No documentation sections are available for your role yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {docRows.map((section) => (
                <article
                  key={section.id}
                  className="bg-white border border-gray-200 shadow-sm rounded-none p-6 md:p-8 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      aria-label={"Tier: " + section.role}
                      className="inline-flex items-center gap-2 rounded-full bg-[#0078E2]/10 px-3 py-1 text-xs font-semibold text-[#005cb3] border border-[#0078E2]/20"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0078E2]" aria-hidden="true" />
                      {section.role}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-[#005cb3] mb-3">{section.title}</h2>
                  <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: section.body }} />
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}