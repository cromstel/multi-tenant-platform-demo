import type { Metadata } from 'next';

import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ScrollProgress } from '@/components/scroll-progress';
import { pageMetadata, structuredData, faqSchema } from '@/lib/seo';

const FAQS = [
  {
    q: 'How does tenant isolation actually work?',
    a: 'Each tenant is bound to a subdomain and a tenant id. The proxy resolves the subdomain, the router scopes the request, and every database query is filtered by tenant id with foreign keys enforcing the relationship at the schema level.',
  },
  {
    q: "Can one customer see another customer's data?",
    a: 'No. Tenant records are keyed by tenant id with cascading foreign keys, and queries always filter on the authenticated tenant id. There is no code path that returns rows outside the active tenant scope.',
  },
  {
    q: 'What happens if the admin session expires?',
    a: 'Both the page guard and the action guard reject the request independently. A stale or tampered cookie is refused, and privileged operations fail closed rather than degrading to an open state.',
  },
  {
    q: 'How is brute-force login handled?',
    a: 'Failed logins increment a counter in the durable store with a rolling time window. Because the counter lives in the database rather than process memory, the limit holds across every instance and survives restarts.',
  },
  {
    q: 'What database does the platform use?',
    a: 'MySQL via the mysql2 driver, with a schema covering tenants, tenant users, tenant sessions, admin users, admin sessions, and a key-value store for counters.',
  },
];

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'FAQ | CITGROUP TENANCY SYSTEM',
    description:
      'Answers about tenant isolation, data privacy, session security, brute-force protection and the MySQL backend of CITGROUP TENANCY SYSTEM.',
    path: '/faq',
    keywords: ['multi-tenant FAQ', 'tenant isolation', 'subdomain tenancy', 'tenant security'],
  }),
};

export default function FaqPage() {
  const jsonLd = structuredData({
    '@context': 'https://schema.org',
    '@graph': [faqSchema(FAQS)],
  });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <SiteHeader />
      <ScrollProgress />

      <main className="flex-1">
        <section id="faq" className="scroll-mt-20 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#005cb3]">FAQ</span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Questions, answered
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                Everything you need to know about how tenants are isolated, how access is
                protected, and where your data lives.
              </p>
            </div>

            <dl className="mt-12 divide-y divide-slate-200 overflow-hidden rounded-none border border-slate-200 bg-white shadow-sm">
              {FAQS.map((faq) => (
                <div key={faq.q} className="group p-6 transition-colors hover:bg-slate-50">
                  <dt className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-none bg-[#0078E2]/10 text-[#005cb3]">
                      <span className="text-xs font-bold">?</span>
                    </span>
                    <h2 className="text-base font-bold text-slate-900">{faq.q}</h2>
                  </dt>
                  <dd className="mt-3 pl-9 text-sm leading-relaxed text-slate-600">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
