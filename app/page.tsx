import Link from 'next/link';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ScrollProgress } from '@/components/scroll-progress';
import { SubdomainForm } from './subdomain-form';
import { rootDomain, protocol } from '@/lib/utils';
import {
  structuredData,
  organizationSchema,
  websiteSchema,
  softwareApplicationSchema,
  faqSchema,
} from '@/lib/seo';
import {
  ArrowRight,
  Globe,
  ShieldCheck,
  Database,
  Zap,
  Lock,
  Gauge,
  Code2,
  CheckCircle2,
  Building2,
  Server,
  Users,
  Workflow,
  Terminal,
} from 'lucide-react';

export const metadata: Metadata = {
  // The root layout's `title.template` applies to child segments, not to the
  // root segment's own page — so the full title is spelled out here.
  title: 'Multi-Tenant SaaS Platform | CITGROUP TENANCY SYSTEM',
  description:
    'Deploy once, isolate every customer. CITGROUP TENANCY SYSTEM gives each tenant its own subdomain, its own data and its own admin view — provisioned in seconds.',
  alternates: { canonical: '/' },
  keywords: [
    'multi-tenant SaaS',
    'subdomain multi-tenancy',
    'tenant isolation platform',
    'white-label SaaS starter',
    'Next.js multi-tenant',
  ],
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'CITGROUP TENANCY SYSTEM',
    title: 'Multi-Tenant SaaS Platform | CITGROUP TENANCY SYSTEM',
    description:
      'Deploy once, isolate every customer. CITGROUP TENANCY SYSTEM gives each tenant its own subdomain, its own data and its own admin view — provisioned in seconds.',
    locale: 'en_US',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'CITGROUP TENANCY SYSTEM — multi-tenant SaaS platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Multi-Tenant SaaS Platform | CITGROUP TENANCY SYSTEM',
    description:
      'Deploy once, isolate every customer. Each tenant gets its own subdomain, its own data and its own admin view.',
    images: ['/opengraph-image'],
  },
};

const STATS = [
  { value: '10K+', label: 'Isolated tenants' },
  { value: '99.99%', label: 'Platform uptime' },
  { value: '<50ms', label: 'Edge routing latency' },
  { value: '24/7', label: 'Global availability' },
];

const FEATURES = [
  {
    icon: Globe,
    title: 'Subdomain Isolation',
    description:
      'Every customer gets a dedicated subdomain with hard data boundaries. One deployment, complete tenant separation — no shared-state bleed.',
  },
  {
    icon: Zap,
    title: 'Instant Provisioning',
    description:
      'Spin up a branded tenant workspace in seconds. Custom subdomain, emoji identity, and isolated storage provisioned automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'Defense in Depth',
    description:
      'Privileged actions are guarded by two independent checks — a page-level guard and an in-action re-verification that survives direct POST.',
  },
  {
    icon: Database,
    title: 'MySQL Backed',
    description:
      'Relational storage with foreign-key integrity, transactional writes, and queryable tenant records. No key-value guesswork.',
  },
  {
    icon: Lock,
    title: 'Rate-Limited Auth',
    description:
      'Brute-force protection backed by the same durable store, so limits hold across every instance instead of resetting per process.',
  },
  {
    icon: Gauge,
    title: 'Admin Analytics',
    description:
      'Real-time visibility into tenant growth, user counts, active sessions, and system health from a single command center.',
  },
];

const ARCHITECTURE_STEPS = [
  {
    icon: Globe,
    title: 'Request Arrives',
    description: 'The edge proxy inspects the Host header and resolves the tenant.',
  },
  {
    icon: Workflow,
    title: 'Tenant Resolved',
    description: 'The request rewrites to the isolated tenant route with its own context.',
  },
  {
    icon: Database,
    title: 'Data Scoped',
    description: 'Every query is filtered by tenant id — enforced by the schema, not by convention.',
  },
  {
    icon: CheckCircle2,
    title: 'Response Delivered',
    description: 'Only that tenant\'s data is rendered. Nothing leaks across boundaries.',
  },
];

const SECURITY_ITEMS = [
  'Signed HS256 session cookies with short expiry windows',
  'Constant-time credential comparison to prevent timing attacks',
  'Server-only DAL isolates every secret from the client bundle',
  'Two independent authorization checks on privileged actions',
  'Durable, store-backed rate limiting across all instances',
  'Foreign-key enforced tenant boundaries in the database',
];

const FAQS = [
  {
    q: 'How does tenant isolation actually work?',
    a: 'Each tenant is bound to a subdomain and a tenant id. The proxy resolves the subdomain, the router scopes the request, and every database query is filtered by tenant id with foreign keys enforcing the relationship at the schema level.',
  },
  {
    q: 'Can one customer see another customer\'s data?',
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

export default function HomePage() {
  // Structured data for the landing page: the organisation, the site, the
  // product itself, and the FAQ list that is visible further down.
  const jsonLd = structuredData({
    '@context': 'https://schema.org',
    '@graph': [
      organizationSchema(),
      websiteSchema(),
      softwareApplicationSchema(),
      faqSchema(FAQS),
    ],
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
        {/* ───────────── Hero ───────────── */}
        <section className="relative overflow-hidden bg-[#0c2238]">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -top-40 left-1/4 h-[560px] w-[560px] rounded-full bg-[#0078E2]/25 blur-[100px]" />
            <div className="absolute -right-32 top-40 h-[420px] w-[420px] rounded-full bg-blue-400/15 blur-[90px]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px]" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
              {/* Copy */}
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-blue-200 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  Multi-tenant infrastructure, production ready
                </span>

                <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                  One platform.
                  <br />
                  <span className="bg-gradient-to-r from-[#4A9DFF] to-[#7DD3FC] bg-clip-text text-transparent">
                    Every tenant isolated.
                  </span>
                </h1>

                <p className="mt-6 max-w-xl text-base leading-relaxed text-blue-100/70 sm:text-lg">
                  CITGROUP TENANCY SYSTEM gives every customer a dedicated subdomain, isolated data,
                  and an independent workspace — all from a single deployment. Provision in seconds,
                  scale without surprises.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center justify-center gap-2 rounded-none bg-[#005cb3] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-[#004A94] hover:shadow-blue-600/45 active:scale-[0.98]"
                  >
                    Create your tenant
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center justify-center gap-2 rounded-none border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:border-white/35 hover:bg-white/10"
                  >
                    Sign in to your tenant
                  </Link>
                </div>

                <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
                  {STATS.map((stat) => (
                    <div key={stat.label}>
                      <dt className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                        {stat.value}
                      </dt>
                      <dd className="mt-1 text-xs font-medium uppercase tracking-wide text-blue-200/75">
                        {stat.label}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Provisioning card */}
              <div className="relative">
                <div
                  className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-[#0078E2]/25 to-transparent blur-2xl"
                  aria-hidden="true"
                />
                <div className="relative rounded-3xl border border-white/12 bg-white/[0.07] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Provision a tenant</p>
                      <p className="mt-0.5 text-xs text-blue-200/75">
                        Live in under ten seconds
                      </p>
                    </div>
                    <span className="rounded-none border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[10px] font-semibold text-blue-200/70">
                      POST /tenants
                    </span>
                  </div>

                  <div className="rounded-none bg-white p-5 shadow-lg">
                    <SubdomainForm />
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-blue-200/75">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      Auto-provisioned storage
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      Isolated by default
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────── Platform ───────────── */}
        <section id="platform" className="scroll-mt-20 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#005cb3]">
                The platform
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Built for teams that ship to many customers
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                A single Next.js deployment becomes a fleet of branded, isolated products. Each
                tenant gets its own subdomain, its own records, and its own administration — without
                duplicating infrastructure.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-none border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#0078E2]/30 hover:shadow-xl hover:shadow-slate-200/60"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-none bg-[#0078E2]/10 text-[#005cb3] transition-colors group-hover:bg-[#005cb3] group-hover:text-white">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── Architecture ───────────── */}
        <section id="architecture" className="scroll-mt-20 border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#005cb3]">
                  Architecture
                </span>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  Isolation by construction
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-600">
                  Tenant boundaries are enforced at every layer — routing, data access, and
                  authorization. There is no configuration to get wrong and no shared state to leak.
                </p>

                <div className="mt-8 overflow-hidden rounded-none border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2.5">
                    <Terminal className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
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
);`}
                  </pre>
                </div>
              </div>

              <ol className="space-y-4">
                {ARCHITECTURE_STEPS.map((step, index) => (
                  <li
                    key={step.title}
                    className="flex gap-4 rounded-none border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-[#0078E2]/30"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-[#005cb3] text-white shadow-lg shadow-blue-600/25">
                        <step.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      {index < ARCHITECTURE_STEPS.length - 1 && (
                        <span className="h-full w-px flex-1 bg-slate-200" aria-hidden="true" />
                      )}
                    </div>
                    <div className="pb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500">
                          0{index + 1}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ───────────── Security ───────────── */}
        <section id="security" className="scroll-mt-20 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#005cb3]">
                  Security
                </span>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  Guarded twice, always
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-600">
                  A page check alone cannot protect a Server Action — actions are reachable by direct
                  POST. So every privileged path in this platform is protected twice, and fails closed
                  when configuration is missing.
                </p>

                <ul className="mt-8 space-y-3">
                  {SECURITY_ITEMS.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                        aria-hidden="true"
                      />
                      <span className="text-sm leading-relaxed text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/register"
                  className="mt-8 inline-flex items-center gap-2 rounded-none bg-[#005cb3] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-[#004A94] active:scale-[0.98]"
                >
                  Create a tenant workspace
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              {/* Visual */}
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: ShieldCheck, label: 'Page guard', value: 'requireAdmin()', tone: 'blue' },
                  { icon: Lock, label: 'Action guard', value: 'getSession()', tone: 'emerald' },
                  { icon: Gauge, label: 'Rate limit', value: '5 / 15 min', tone: 'amber' },
                  { icon: Server, label: 'Store', value: 'MySQL', tone: 'violet' },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-none border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <card.icon className="h-6 w-6 text-[#005cb3]" aria-hidden="true" />
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {card.label}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-slate-900">{card.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ───────────── Use cases ───────────── */}
        <section className="border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#005cb3]">
                Built for
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                One platform, many business models
              </h2>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Building2,
                  title: 'White-label SaaS',
                  text: 'Ship a branded product to every customer without rebuilding the stack.',
                },
                {
                  icon: Users,
                  title: 'Agency Client Portals',
                  text: 'Give every client their own workspace, data boundary, and admin view.',
                },
                {
                  icon: Code2,
                  title: 'Developer Platforms',
                  text: 'Provision isolated environments per team with predictable boundaries.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-none border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-none bg-slate-900 text-white">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── FAQ ───────────── */}
        <section id="faq" className="scroll-mt-20 bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#005cb3]">FAQ</span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Questions, answered
              </h2>
            </div>

            <dl className="mt-12 divide-y divide-slate-200 overflow-hidden rounded-none border border-slate-200 bg-white shadow-sm">
              {FAQS.map((faq) => (
                <div key={faq.q} className="group p-6 transition-colors hover:bg-slate-50">
                  <dt className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-none bg-[#0078E2]/10 text-[#005cb3]">
                      <span className="text-xs font-bold">?</span>
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{faq.q}</h3>
                  </dt>
                  <dd className="mt-3 pl-9 text-sm leading-relaxed text-slate-600">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ───────────── CTA ───────────── */}
        <section className="relative overflow-hidden bg-[#0c2238] py-20 sm:py-24">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-[#0078E2]/25 blur-[100px]" />
          </div>

          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to launch your first tenant?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-blue-100/70">
              Provision a branded, isolated workspace in seconds. No configuration, no shared state,
              no surprises at scale.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 rounded-none bg-[#005cb3] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-[#004A94] active:scale-[0.98]"
              >
                Create your tenant
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-none border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:border-white/35 hover:bg-white/10"
              >
                I already have a tenant
              </Link>
            </div>

            <p className="mt-8 text-xs text-blue-200/75">
              Serving from {rootDomain} · {protocol === 'https' ? 'TLS encrypted' : 'Local development'}
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
