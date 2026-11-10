import type { Metadata } from 'next';
import { Database, Lock, ShieldCheck, Server } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ScrollProgress } from '@/components/scroll-progress';
import { pageMetadata, structuredData, organizationSchema, softwareApplicationSchema } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Data Isolation | CITGROUP TENANCY SYSTEM',
  description:
    'Guaranteed data boundaries with MySQL-backed relational storage and strict tenant scoping. Foreign key enforced boundaries, automatic tenant scoping, transactional integrity.',
  path: '/services/data-isolation',
  keywords: [
    'data isolation',
    'tenant isolation',
    'data boundaries',
    'MySQL',
    'multi-tenant data isolation',
    'CITGROUP tenancy services',
  ],
});

const DATA_ISOLATION_FEATURES = [
  {
    icon: Database,
    title: 'Foreign Key Enforced Boundaries',
    description:
      'Every tenant-owned row carries a tenant_id with foreign keys enforcing the relationship at the schema level. Isolation cannot drift because it is enforced by the database.',
  },
  {
    icon: ShieldCheck,
    title: 'Automatic Tenant Scoping',
    description:
      'Every database query is filtered by the authenticated tenant id. Tenant records are keyed by tenant id with cascading foreign keys — queries always filter on the authenticated tenant id.',
  },
  {
    icon: Lock,
    title: 'Transactional Integrity',
    description:
      'Tenant creation and user insertion happen in a single transaction. A tenant without an owner is unreachable — both rows are written together or neither is.',
  },
  {
    icon: Server,
    title: 'No Shared State Leakage',
    description:
      'Tenant records are keyed by tenant id first, and every read path filters on the authenticated tenant before it uses the key. There is no global namespace a user can guess into.',
  },
];

export default function DataIsolationPage() {
  const jsonLd = structuredData({
    '@context': 'https://schema.org',
    '@graph': [organizationSchema(), softwareApplicationSchema()],
  });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <SiteHeader />
      <ScrollProgress />

      <main className="flex-1">
        <section className="py-20 sm:py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="text-center">
              <span className="inline-block text-xs font-bold uppercase tracking-[0.15em] text-[#005cb3]">
                Data Isolation
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Hard Data Boundaries
              </h2>
              <p className="mt-6 text-base leading-relaxed text-slate-600 sm:text-lg">
                Guaranteed data boundaries with MySQL-backed relational storage and strict tenant scoping.
                Every query is filtered by tenant id — enforced by the schema, not by convention.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {DATA_ISOLATION_FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-none border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-none bg-gradient-to-br from-[#0078E2] to-[#5B9CF5] text-white shadow-lg transition-transform duration-300 group-hover:scale-105">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                How Isolation Works
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                Each tenant is bound to a subdomain and a tenant id. The proxy resolves the subdomain,
                the router scopes the request, and every database query is filtered by tenant id with
                foreign keys enforcing the relationship at the schema level.
              </p>
            </div>

            <div className="mt-12 overflow-hidden rounded-none border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2.5">
                <Database className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span className="font-mono text-xs text-slate-600">tenant-resolution.ts</span>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-700">
{`const subdomain = extractSubdomain(host);
// host: acme.platforms.example.com
//   -> tenant "acme"

const tenant = await resolveTenant(subdomain);
// tenantId: 42

const rows = await db.query(
  'SELECT * FROM records WHERE tenant_id = ?',
  [tenantId]  // always scoped
);`}</pre>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
