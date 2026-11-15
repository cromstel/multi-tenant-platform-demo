import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Calendar, Link as LuLink, Sparkles } from 'lucide-react';
import { getSubdomainData } from '@/lib/subdomains';
import { getMySQLPool } from '@/lib/db/mysql';
import { protocol, rootDomain, sanitizeSubdomain } from '@/lib/utils';
import { pageMetadata, structuredData, siteUrl } from '@/lib/seo';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export async function generateMetadata({
  params
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    return {
      // No site-name suffix here — the root layout's `title.template`
      // appends it, and baking it in as well doubles it.
      title: 'Subdomain Not Found',
      robots: { index: false, follow: false },
    };
  }

  return pageMetadata({
    title: subdomain,
    description: `${subdomain} is a tenant workspace on CITGROUP TENANCY SYSTEM. Sign in to manage members, settings and integrations.`,
    // The page is served from the tenant's own subdomain, so the canonical
    // has to be absolute. `/{subdomain}` on the platform host is a 404.
    canonical: `${protocol}://${subdomain}.${rootDomain}/`,
    keywords: [subdomain, 'tenant workspace', 'CITGROUP tenancy'],
  });
}

export default async function SubdomainPage({
  params
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  // Resolve the tenant id from the subdomain, then count its members.
  // `session.tenantId` is not available on the public page, so we look it up
  // directly from the `tenants` table using the sanitized subdomain.
  let memberCount = 0;
  try {
    const pool = await getMySQLPool();
    const [tenantRows] = await pool.execute(
      'SELECT id FROM tenants WHERE subdomain = ?',
      [sanitizeSubdomain(subdomain)]
    );
    const tenant = (tenantRows as Array<{ id: number }>)[0];
    if (tenant) {
      const [countRows] = await pool.execute(
        'SELECT COUNT(*) as count FROM tenant_users WHERE tenant_id = ?',
        [tenant.id]
      );
      memberCount = Number((countRows as Array<{ count: number }>)[0]?.count) || 0;
    }
  } catch {
    // Database unavailable — badges degrade gracefully to a zero count.
    memberCount = 0;
  }

  const memberSince = new Date(subdomainData.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Structured data describing the tenant as an organisation of its own,
  // parented by the platform. Both `@id`s are absolute so a crawler can tell
  // the tenant apart from the platform's own organisation node.
  const jsonLd = structuredData([
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${protocol}://${subdomain}.${rootDomain}/#organization`,
      name: subdomain,
      url: `${protocol}://${subdomain}.${rootDomain}`,
      logo: {
        '@type': 'ImageObject',
        url: `${protocol}://${subdomain}.${rootDomain}/icon.svg`,
      },
      parentOrganization: { '@id': `${siteUrl()}/#organization` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${protocol}://${subdomain}.${rootDomain}/#faqpage`,
      url: `${protocol}://${subdomain}.${rootDomain}/faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How does tenant isolation work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Each tenant is bound to a subdomain and tenant id; queries filter by tenant id with foreign keys enforcing boundaries.',
          },
        },
      ],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `/` },
        { '@type': 'ListItem', position: 2, name: subdomain, item: `/${subdomain}` },
      ],
    },
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <header className="fixed top-4 right-4 z-10">
        <Link
          href={`${protocol}://${rootDomain}`}
          className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors bg-white/80 backdrop-blur-sm rounded-none border border-slate-200"
        >
          CITGROUP TENANCY SYSTEM
        </Link>
      </header>

      <main className="flex-1 w-full xl:px-12 flex items-center justify-center py-20">
        <div className="w-full text-center">
          <div className="text-9xl mb-6">{subdomainData.emoji}</div>

          <div className="mb-4 flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0078E2]/10 text-[#005cb3] text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-[#005cb3]" aria-hidden="true"></span>
              Active
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0078E2]/10 text-[#005cb3] text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-[#005cb3]" aria-hidden="true"></span>
              {memberCount} members
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0078E2]/10 text-[#005cb3] text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-[#005cb3]" aria-hidden="true"></span>
              Member since {memberSince}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-3">
            Welcome to <span className="text-[#005cb3]">{subdomain}</span>
          </h1>

          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            This is your custom subdomain page on CITGROUP TENANCY SYSTEM.
            Your tenant is configured and ready to use.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
            <div className="bg-white rounded-none p-5 border border-slate-200 shadow-sm">
              <div className="text-3xl mb-2 text-[#005cb3]" aria-hidden="true">
                <Calendar />
              </div>
              <div className="text-sm text-slate-500">Created</div>
              <div className="font-medium text-slate-900">
                {new Date(subdomainData.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>

            <div className="bg-white rounded-none p-5 border border-slate-200 shadow-sm">
              <div className="text-3xl mb-2 text-[#005cb3]" aria-hidden="true">
                <LuLink />
              </div>
              <div className="text-sm text-slate-500">Subdomain</div>
              <div className="font-medium text-slate-900 text-sm">
                {subdomain}.{rootDomain}
              </div>
            </div>

            <div className="bg-white rounded-none p-5 border border-slate-200 shadow-sm">
              <div className="text-3xl mb-2 text-[#005cb3]" aria-hidden="true">
                <Sparkles />
              </div>
              <div className="text-sm text-slate-500">Status</div>
              <div className="font-medium text-green-700">Active</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`${protocol}://${rootDomain}/auth/login`}
              className="px-6 py-3 rounded-none bg-[#005cb3] text-white font-medium hover:bg-[#004A94] transition-colors"
            >
              Tenant Sign In
            </Link>
            <Link
              href={`${protocol}://${rootDomain}/dashboard`}
              className="px-6 py-3 rounded-none bg-white text-slate-700 font-medium hover:bg-slate-50 border border-slate-300 transition-colors"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
