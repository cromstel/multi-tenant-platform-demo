import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  Gauge,
  Layers,
  Lock,
  Settings2,
  ShieldCheck,
  TrendingUp,
  Workflow,
} from 'lucide-react';

import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ScrollProgress } from '@/components/scroll-progress';
import { rootDomain } from '@/lib/utils';
import {
  aboutPageSchema,
  organizationSchema,
  pageMetadata,
  structuredData,
} from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'About',
  description:
    'Why CITGROUP TENANCY SYSTEM treats tenant isolation as the foundation: subdomain routing, schema-enforced boundaries, two-check authorization, and MySQL-backed records.',
  path: '/about',
  keywords: [
    'about CITGROUP',
    'multi-tenant architecture',
    'tenant isolation',
    'subdomain SaaS platform',
    'secure multi-tenancy',
  ],
});

const STATS = [
  { value: '10K+', label: 'Isolated tenants' },
  { value: '99.99%', label: 'Platform uptime' },
  { value: '<50ms', label: 'Edge routing latency' },
  { value: '24/7', label: 'Global availability' },
];

// Literal class names so Tailwind generates each one. These set only the
// animation delay, leaving `transition-delay` free for the hover lift.
const ENTRANCE_DELAYS = [
  '[--tw-animation-delay:0ms]',
  '[--tw-animation-delay:100ms]',
  '[--tw-animation-delay:200ms]',
  '[--tw-animation-delay:300ms]',
];

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Security',
    accent: 'from-[#005cb3] to-[#0078E2]',
    description:
      'Privileged actions are checked twice — once when the page renders and again inside the action. A direct POST cannot skip the browser.',
    points: [
      'Signed, short-lived session cookies',
      'Durable, store-backed rate limits',
      'Secrets kept server-side',
    ],
    href: '/faq#security',
    linkLabel: 'How security works',
  },
  {
    icon: TrendingUp,
    title: 'Scale',
    accent: 'from-emerald-600 to-teal-600',
    description:
      'Provisioning is a single transaction, routing happens at the edge, and tenants share infrastructure without ever sharing data.',
    points: [
      'Subdomain routing at the edge',
      'Independent tenant growth',
      'Relational integrity by default',
    ],
    href: '/#architecture',
    linkLabel: 'See the architecture',
  },
  {
    icon: Layers,
    title: 'Isolation',
    accent: 'from-indigo-600 to-violet-600',
    description:
      'Tenant identity is derived from the request host and carried through every query. There is no client-supplied tenant switch.',
    points: [
      'A dedicated subdomain per customer',
      'Every query scoped by tenant id',
      'Sessions bound to their host',
    ],
    href: '/faq#isolation',
    linkLabel: 'Read the isolation model',
  },
];

const PRINCIPLES = [
  {
    icon: Database,
    title: 'Boundaries live in the schema',
    description:
      'Every tenant-owned row carries a tenant id and a foreign key. Isolation cannot drift because it is enforced by the database, not by a helper someone can forget to call.',
  },
  {
    icon: Lock,
    title: 'Two checks, always',
    description:
      'A page-level guard controls what renders. The Server Action re-checks the session before it mutates anything, because actions are reachable by direct POST.',
  },
  {
    icon: Workflow,
    title: 'One source of truth',
    description:
      'Tenant records live in MySQL. Counters live in the key/value store. Nothing is written to one store and read from the other, so the admin view never disagrees with reality.',
  },
  {
    icon: Settings2,
    title: 'Configuration is environment',
    description:
      'Ports, hosts, and the admin path come from the environment file. No hardcoded localhost strings, and no drift between the proxy and the application.',
  },
];

const GLANCE = [
  {
    icon: Building2,
    title: 'One deployment',
    description: 'Ship once and serve every tenant from the same build.',
  },
  {
    icon: Lock,
    title: 'Hard boundaries',
    description: 'Tenant ids gate every query; foreign keys enforce the relationship.',
  },
  {
    icon: Gauge,
    title: 'Operator clarity',
    description: 'One admin view for growth, activity, and platform health.',
  },
];

export default function AboutPage() {
  const jsonLd = structuredData({
    '@context': 'https://schema.org',
    '@graph': [organizationSchema(), aboutPageSchema()],
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
        {/* ───────────── Hero banner ───────────── */}
        <section className="relative overflow-hidden bg-[#0c2238] text-white">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -top-28 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#0078E2]/10 blur-[110px] motion-safe:animate-pulse" />
            <div className="absolute -right-24 top-32 h-80 w-80 rounded-full bg-[#5B9CF5]/10 blur-[90px]" />
            <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-indigo-400/10 blur-[90px]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,92,179,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,92,179,0.055)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
          </div>

          <div className="relative w-full px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8 xl:px-12">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 fill-mode-both motion-reduce:animate-none">
                About{' '}
                {/* Gradient text is painted by `background-clip`, which axe
                    reports as "incomplete" rather than checking it. Every stop
                    therefore stays inside the brand scale — the light
                    `#5B9CF5` used for decorative glows measures 2.6:1 here and
                    would fail AA for large text. */}
                <span className="inline-block bg-gradient-to-r from-[#004A94] via-[#005cb3] to-[#0078E2] bg-clip-text text-transparent">
                  CITGROUP
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-blue-100/80 sm:text-lg animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 fill-mode-both motion-reduce:animate-none">
                We build multi-tenant infrastructure for teams who refuse to
                trade isolation for convenience. One deployment, a dedicated
                subdomain for every customer, and data boundaries that are
                enforced by the platform — not by a promise in a policy
                document.
              </p>

              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 fill-mode-both motion-reduce:animate-none">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center gap-2 bg-[#005cb3] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-[#004A94] hover:shadow-blue-600/45 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078E2] focus-visible:ring-offset-2 motion-reduce:transition-none"
                >
                  Create your tenant
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center border border-slate-300 bg-white/70 px-6 py-3.5 text-sm font-bold text-slate-700 backdrop-blur-sm transition-all hover:border-[#0078E2]/40 hover:bg-white hover:text-[#005cb3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078E2] focus-visible:ring-offset-2 motion-reduce:transition-none"
                >
                  Talk to our team
                </Link>
              </div>
            </div>

            <dl className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-px overflow-hidden border border-white/10 bg-white/5 shadow-xl shadow-black/10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500 fill-mode-both motion-reduce:animate-none sm:grid-cols-4">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col-reverse bg-[#0c2238]/70 px-4 py-5 text-center backdrop-blur-sm ring-1 ring-white/10"
                >
                  <dt className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-blue-200/70">
                    {stat.label}
                  </dt>
                  <dd className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ───────────── Mission ───────────── */}
        <section className="bg-white py-20 sm:py-24" aria-labelledby="mission-heading">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#005cb3]">
                  Our mission
                </span>
                <h2
                  id="mission-heading"
                  className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
                >
                  Isolation is not a feature. It is the foundation.
                </h2>

                <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-600">
                  <p>
                    CITGROUP TENANCY SYSTEM started from a practical problem:
                    most multi-tenant products ask customers to trust a shared
                    database, a shared session, and a shared admin surface. One
                    missed filter is all it takes to expose another customer&rsquo;s
                    data.
                  </p>
                  <p>
                    We took the opposite position. Every tenant gets its own
                    subdomain, its own rows, and its own boundaries — enforced
                    by the schema and re-checked at the point of action, not by
                    convention. The result is a platform that is simple to
                    operate and hard to misuse.
                  </p>
                </div>

                <blockquote className="mt-8 border-l-4 border-[#0078E2] pl-5">
                  <p className="text-lg font-bold leading-snug text-slate-900">
                    One deployment. Every customer isolated.
                  </p>
                  <footer className="mt-1 text-sm text-slate-600">
                    The constraint every product decision is measured against.
                  </footer>
                </blockquote>
              </div>

              <div className="relative border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#005cb3] text-white shadow-lg shadow-blue-600/25">
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#005cb3]">
                      At a glance
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">
                      What we optimise for
                    </h3>
                  </div>
                </div>

                <ul className="mt-6 divide-y divide-slate-200">
                  {GLANCE.map((item) => (
                    <li key={item.title} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center bg-[#0078E2]/10 text-[#005cb3]">
                        <item.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          {item.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────── Values ───────────── */}
        <section
          id="values"
          className="scroll-mt-24 border-y border-slate-200 bg-slate-50 py-20 sm:py-24"
          aria-labelledby="values-heading"
        >
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#005cb3]">
                What we stand for
              </span>
              <h2
                id="values-heading"
                className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
              >
                Three commitments we do not trade away
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                They are architectural choices, not marketing lines. Each one
                has a matching constraint in the codebase — and a reason it is
                not negotiable.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {VALUES.map((value, index) => (
                <div
                  key={value.title}
                  className={`group flex flex-col border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#0078E2]/30 hover:shadow-xl hover:shadow-slate-200/60 animate-in fade-in slide-in-from-bottom-6 [--tw-animation-duration:700ms] fill-mode-both motion-reduce:animate-none motion-reduce:transform-none motion-reduce:transition-none ${ENTRANCE_DELAYS[index]}`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center bg-gradient-to-br ${value.accent} text-white shadow-lg transition-transform duration-300 group-hover:scale-105`}
                  >
                    <value.icon className="h-6 w-6" aria-hidden="true" />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-900">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {value.description}
                  </p>

                  <ul className="mt-5 space-y-2.5">
                    {value.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                          aria-hidden="true"
                        />
                        <span className="text-sm leading-relaxed text-slate-700">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={value.href}
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#005cb3] transition-colors hover:text-[#004A94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078E2] focus-visible:ring-offset-2"
                  >
                    {value.linkLabel}
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── Principles ───────────── */}
        <section
          id="principles"
          className="scroll-mt-24 bg-white py-20 sm:py-24"
          aria-labelledby="principles-heading"
        >
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#005cb3]">
                How we build
              </span>
              <h2
                id="principles-heading"
                className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
              >
                Four rules the platform runs on
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                The same constraints appear in the code review checklist, the
                database schema, and the product. None of them are optional.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {PRINCIPLES.map((principle, index) => (
                <div
                  key={principle.title}
                  className={`relative border border-slate-200 bg-white p-6 transition-colors duration-300 hover:border-[#0078E2]/30 hover:bg-slate-50/60 animate-in fade-in slide-in-from-bottom-6 [--tw-animation-duration:700ms] fill-mode-both motion-reduce:animate-none ${ENTRANCE_DELAYS[index]}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center bg-[#0078E2]/10 text-[#005cb3]">
                      <principle.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-bold tracking-[0.2em] text-slate-500">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">
                    {principle.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {principle.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── Closing CTA ───────────── */}
        <section
          className="relative overflow-hidden bg-[#0c2238] py-20 sm:py-24"
          aria-labelledby="about-cta-heading"
        >
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-[#0078E2]/25 blur-[100px]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          </div>

          <div className="relative w-full px-4 text-center sm:px-6 lg:px-8 xl:px-12">
            <h2
              id="about-cta-heading"
              className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl"
            >
              Give every customer their own space.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-blue-100/70">
              Provision a tenant in seconds. Keep every record exactly where it
              belongs, from the first sign-in to the last report.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center gap-2 bg-[#005cb3] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-[#004A94] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c2238] motion-reduce:transition-none"
              >
                Create your tenant
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/faq"
                className="inline-flex items-center justify-center border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:border-white/35 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c2238] motion-reduce:transition-none"
              >
                Read the FAQ
              </Link>
            </div>

            <p className="mt-8 text-xs text-blue-200/75">
              Serving from {rootDomain} · Built and operated by CITGROUP
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
