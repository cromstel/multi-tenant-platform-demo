import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, ShieldCheck, Server, Users, LifeBuoy } from 'lucide-react';

import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ScrollProgress } from '@/components/scroll-progress';
import { pageMetadata, structuredData, faqSchema } from '@/lib/seo';
import { rootDomain } from '@/lib/utils';

type Faq = { q: string; a: string };
type FaqGroup = { id: string; title: string; blurb: string; icon: typeof BookOpen; items: Faq[] };

const GROUPS: FaqGroup[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    blurb: 'What a tenant is, and how one gets created.',
    icon: BookOpen,
    items: [
      {
        q: 'What exactly is a tenant?',
        a: 'A tenant is one isolated workspace: a subdomain, a set of users, and its own rows in every table. Two tenants on the same deployment share the binary and the database server, but never share application data. Creating a tenant is a single form submission — there is no separate deployment, container or configuration file per customer.',
      },
      {
        q: 'How long does provisioning take?',
        a: 'Provisioning is a single transaction: insert the tenant row, insert the owner user, commit, then issue a session. On a warm database it completes in well under a second. The new tenant is reachable immediately at its subdomain — no DNS step, because every tenant subdomain resolves through the same wildcard host.',
      },
      {
        q: 'What do I need to create a tenant?',
        a: 'A subdomain (lowercase letters, numbers and hyphens, up to 63 characters), a work email address, and a password of at least eight characters. The subdomain must not already be taken, and it must survive sanitisation unchanged — the form rejects a value rather than silently rewriting it.',
      },
      {
        q: 'Who is the first user of a new tenant?',
        a: 'The person who registers becomes the owner. Owners can invite members and change roles from the tenant dashboard; members can sign in but cannot manage the workspace. Every user record carries the tenant id, so an account is only ever valid inside its own tenant.',
      },
      {
        q: 'Can I change a subdomain after creating it?',
        a: 'Not from the UI today. The subdomain is the routing key and the value tenants link to, so renaming would break bookmarks and sessions. If a rename is unavoidable, an operator can update the row in MySQL and every request resolves to the new host on the next hit.',
      },
    ],
  },
  {
    id: 'isolation',
    title: 'Tenant isolation',
    blurb: 'How boundaries are enforced, not just configured.',
    icon: Users,
    items: [
      {
        q: 'How does tenant isolation actually work?',
        a: 'Each tenant is bound to a subdomain and a tenant id. The proxy resolves the subdomain, the router scopes the request, and every database query is filtered by tenant id with foreign keys enforcing the relationship at the schema level. Isolation is derived from the request, not from a value the client can send.',
      },
      {
        q: "Can one customer see another customer's data?",
        a: 'No. Tenant records are keyed by tenant id with cascading foreign keys, and queries always filter on the authenticated tenant id. There is no code path that returns rows outside the active tenant scope. Sessions carry the tenant id, so a token minted for one tenant cannot address another.',
      },
      {
        q: 'What happens if someone edits the URL to another subdomain?',
        a: 'They get that subdomain\'s public page, but not its data. The session cookie is scoped to the host that issued it, and the server re-derives the tenant from the request host on every call — the browser cannot promote one tenant session into another by changing the address bar.',
      },
      {
        q: 'How are files and uploads separated?',
        a: 'Anything written for a tenant is keyed by tenant id first, and every read path filters on the authenticated tenant before it uses the key. There is no global namespace a user can guess into, and an object key from one tenant is useless inside another.',
      },
      {
        q: 'Is the database per tenant?',
        a: 'No — one MySQL database holds all tenants, separated by `tenant_id` on every table with foreign keys and cascading deletes. That keeps provisioning instant and backups simple, while isolation is enforced by the query shape and the schema rather than by connection routing.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Security and sessions',
    blurb: 'Sign-in, session lifetime, and privileged actions.',
    icon: ShieldCheck,
    items: [
      {
        q: 'What happens if the admin session expires?',
        a: 'Both the page guard and the action guard reject the request independently. A stale or tampered cookie is refused, and privileged operations fail closed rather than degrading to an open state. Signing in again issues a fresh token; the expired one is never re-validated.',
      },
      {
        q: 'How is brute-force login handled?',
        a: 'Failed logins increment a counter in the durable store with a rolling time window. Because the counter lives in the database rather than process memory, the limit holds across every instance and survives restarts. The sign-in form reports how many minutes remain rather than failing silently.',
      },
      {
        q: 'Where are sessions stored, and can they be revoked?',
        a: 'Sessions are signed HS256 tokens in an httpOnly, SameSite=Lax cookie, and the server records each one so it can be revoked. Expiry is short — 24 hours for tenant sessions — and the record is checked on the way in, so deleting a session row logs that user out on their next request.',
      },
      {
        q: 'How are passwords stored?',
        a: 'Only as salted hashes, produced by a single module (`lib/password.ts`) that every sign-in and registration path calls. There is no place in the codebase that compares a plaintext password, and no second implementation to drift from the first.',
      },
      {
        q: 'Why is the admin area on a hidden URL?',
        a: 'The admin entry point is configured by the `ADMIN_PATH` environment variable. While it is set, the internal routes answer 404 rather than redirecting — a redirect would hand the real path to anyone who guesses it. The admin pages are also excluded from the sitemap and marked noindex.',
      },
      {
        q: 'Are privileged actions protected by the page check?',
        a: 'No, and they never should be. Server Actions are reachable by direct POST, bypassing whatever the page decided to render. Every privileged action therefore re-checks the session itself; the page check only decides which UI appears, while the action check is the one that protects data.',
      },
    ],
  },
  {
    id: 'platform',
    title: 'Platform and operations',
    blurb: 'Stack, runtime and day-two concerns.',
    icon: Server,
    items: [
      {
        q: 'What database does the platform use?',
        a: 'MySQL via the mysql2 driver, with a schema covering tenants, tenant users, tenant sessions, admin users, admin sessions, and a key-value store for counters. The schema is created on first use, so a fresh checkout only needs an empty database — there is no migration step to forget.',
      },
      {
        q: 'What is the platform built on?',
        a: 'Next.js 16 with the App Router, React Server Components by default, TypeScript in strict mode, and Tailwind for styling. Server Actions handle mutation, and a root `proxy.ts` maps the Host header to a tenant before the request reaches a route.',
      },
      {
        q: 'How are rate limits shared across instances?',
        a: 'Counters live in the same durable store the rest of the app uses, never in process memory. A second app instance — or a restart — therefore sees the same budget, so a limit of five sign-in attempts per fifteen minutes means five across the fleet, not five per process.',
      },
      {
        q: 'Where do ports and hostnames come from?',
        a: `Every origin is derived from configuration rather than hard-coded strings: the root domain and protocol are read from the environment, and links are built from them. That is why a tenant is reachable at \`{subdomain}.${rootDomain}\` in development and at your production domain without a code change.`,
      },
      {
        q: 'How do I deploy it?',
        a: 'The build produces a self-contained standalone output, so the app runs from a single Docker image with no dependency install at runtime. Point the wildcard DNS record for your root domain at the service and every tenant subdomain is served by the same deployment.',
      },
      {
        q: 'Is there an API?',
        a: 'Yes. The JSON API answers with a single envelope — `{ ok: true, data }` or `{ ok: false, error }` — and accepts either the admin session cookie or a machine key. Anything that creates data is rate-limited, and the health endpoint is the only unauthenticated route.',
      },
    ],
  },
];

const ALL_FAQS: Faq[] = GROUPS.flatMap((group) => group.items);

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'FAQ | CITGROUP TENANCY SYSTEM',
    description:
      'Answers about tenant isolation, onboarding, session security, brute-force protection, the MySQL backend and deploying CITGROUP TENANCY SYSTEM.',
    path: '/faq',
    keywords: [
      'multi-tenant FAQ',
      'tenant isolation',
      'subdomain tenancy',
      'tenant security',
      'multi-tenant architecture',
    ],
  }),
};

export default function FaqPage() {
  const jsonLd = structuredData({
    '@context': 'https://schema.org',
    '@graph': [
      faqSchema(ALL_FAQS),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
          { '@type': 'ListItem', position: 2, name: 'FAQ', item: '/faq' },
        ],
      },
    ],
  });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <SiteHeader />
      <ScrollProgress />

      <main className="flex-1">
        {/* Hero banner */}
        <section className="relative overflow-hidden bg-[#0c2238]">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -top-40 left-1/4 h-[560px] w-[560px] rounded-full bg-[#0078E2]/25 blur-[100px]" />
            <div className="absolute -right-32 top-24 h-[420px] w-[420px] rounded-full bg-blue-400/15 blur-[90px]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px]" />
          </div>

          <div className="relative w-full px-4 py-16 sm:px-6 sm:py-24 lg:px-8 xl:px-12">
            <h1 className="mt-0 max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Frequently asked{' '}
                <span className="bg-gradient-to-r from-[#4A9DFF] to-[#7DD3FC] bg-clip-text text-transparent">
                  questions
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-relaxed text-blue-100/70 sm:text-lg">
                How tenants are created, how their data stays separate, how sign-in is protected and
                what the platform runs on. If something is still unclear, the contact form reaches a
                person.
              </p>

              {/* Jump links */}
              <ul className="mt-9 flex flex-wrap gap-2">
                {GROUPS.map((group) => (
                  <li key={group.id}>
                    <a
                      href={`#${group.id}`}
                      className="inline-flex items-center gap-1.5 border border-white/20 bg-white/5 px-3.5 py-2 text-xs font-semibold text-blue-100 backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white"
                    >
                      <group.icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {group.title}
                    </a>
                  </li>
                ))}
              </ul>

              <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
                {[
                  { value: `${ALL_FAQS.length}`, label: 'Answered questions' },
                  { value: `${GROUPS.length}`, label: 'Topic areas' },
                  { value: '24/7', label: 'Tenant availability' },
                ].map((stat) => (
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
        </section>

        {/* Groups */}
        <div className="grid w-full items-start gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:px-8 xl:px-12">
          {GROUPS.map((group) => (
            <section key={group.id} id={group.id} className="scroll-mt-24">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center bg-[#0078E2]/10 text-[#005cb3]">
                  <group.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                    {group.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{group.blurb}</p>
                </div>
              </div>

              <dl className="mt-6 divide-y divide-slate-200 border border-slate-200 bg-white">
                {group.items.map((faq) => (
                  <div key={faq.q} className="p-5 transition-colors hover:bg-slate-50 sm:p-6">
                    <dt className="text-base font-bold text-slate-900">{faq.q}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        {/* CTA */}
        <section className="border-t border-slate-200 bg-slate-50 py-16 sm:py-20">
          <div className="w-full px-4 text-center sm:px-6 lg:px-8 xl:px-12">
            <span className="mx-auto flex h-11 w-11 items-center justify-center bg-[#005cb3] text-white">
              <LifeBuoy className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Still have a question?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-600">
              Send it through the contact form — support, sales and billing questions all land in the
              same inbox, and a person answers.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-[#005cb3] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-[#004A94] active:scale-[0.98]"
              >
                Contact us
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Create a tenant
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

