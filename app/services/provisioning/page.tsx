import type { Metadata } from 'next';
import { Server, ShieldCheck, Database, Gauge } from 'lucide-react';
import { HeroBanner } from '@/components/hero-banner';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ScrollProgress } from '@/components/scroll-progress';
import { pageMetadata, structuredData, organizationSchema, softwareApplicationSchema } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Provisioning API | CITGROUP TENANCY SYSTEM',
  description:
    'RESTful API for programmatic tenant creation and management through a single endpoint. Instant subdomain creation, automatic storage allocation, and branded workspace setup.',
  path: '/services/provisioning',
  keywords: [
    'provisioning API',
    'tenant creation',
    'subdomain creation',
    'API endpoints',
    'CITGROUP tenancy services',
  ],
});

const PROVISIONING_FEATURES = [
  {
    icon: Server,
    title: 'Instant Subdomain Creation',
    description:
      'Create a new tenant subdomain in seconds via a single API call. The proxy routes traffic immediately — no DNS configuration required.',
  },
  {
    icon: Database,
    title: 'Automatic Storage Allocation',
    description:
      'Each tenant gets isolated storage automatically provisioned during creation. No manual configuration needed.',
  },
  {
    icon: ShieldCheck,
    title: 'Branded Workspace Setup',
    description:
      'Custom emoji branding and tenant identity are applied during provisioning. Each tenant gets a unique workspace identity.',
  },
  {
    icon: Gauge,
    title: 'Idempotent Operations',
    description:
      'All provisioning operations are idempotent — calling the same API multiple times produces the same result without side effects.',
  },
];

export default function ProvisioningPage() {
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
        <HeroBanner>
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.15em] text-blue-200">
              Provisioning API
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Programmatic Tenant Provisioning
            </h2>
            <p className="mt-6 text-base leading-relaxed text-blue-100/80 sm:text-lg">
              Create tenants and manage their lifecycle through a single RESTful API endpoint.
              Automate tenant creation, storage allocation, and branded workspace setup.
            </p>
          </div>
        </HeroBanner>

        <section className="py-20 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {PROVISIONING_FEATURES.map((feature) => (
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
                API Reference
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                Provision tenants programmatically through our RESTful API.
              </p>
            </div>

            <div className="mt-12 overflow-hidden rounded-none border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2.5">
                <Server className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                <span className="font-mono text-xs text-slate-600">tenant-resolution.ts</span>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-700">
{`POST /api/v1/tenants
Authorization: Bearer <machine-key>
Content-Type: application/json

{
  "subdomain": "acme",
  "emoji": "🚀",
  "email": "owner@acme.com",
  "password": "secure-password-123"
}`}</pre>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
