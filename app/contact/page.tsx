import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  LifeBuoy,
  MessageSquare,
  Building2,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Headphones,
} from 'lucide-react';

import { ContactForm } from './form';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ScrollProgress } from '@/components/scroll-progress';
import { rootDomain } from '@/lib/utils';
import {
  pageMetadata,
  structuredData,
  organizationSchema,
  contactPageSchema,
  faqSchema,
} from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Contact & Support',
  description:
    'Reach the CITGROUP TENANCY SYSTEM support team for technical help, sales enquiries, billing questions, or partnership opportunities. First response within one business day.',
  path: '/contact',
  keywords: [
    'contact support',
    'CITGROUP tenancy support',
    'multi-tenant platform sales',
    'technical support enquiry',
  ],
});

const CHANNELS = [
  {
    icon: Headphones,
    title: 'Technical support',
    description:
      'Something broken in a tenant? Include the subdomain, the error message and the time it happened.',
    accent: 'from-[#0078E2] to-[#5B9CF5]',
    action: 'support@citgroup.example',
  },
  {
    icon: MessageSquare,
    title: 'Sales enquiries',
    description:
      'Pricing, volume discounts, evaluation environments and rollout planning for larger deployments.',
    accent: 'from-indigo-500 to-violet-600',
    action: 'sales@citgroup.example',
  },
  {
    icon: Building2,
    title: 'Partnerships',
    description:
      'Resellers, integrators and technology partners who want to build on the tenancy platform.',
    accent: 'from-emerald-500 to-teal-600',
    action: 'partners@citgroup.example',
  },
];

const OFFICES = [
  {
    city: 'London',
    role: 'Headquarters',
    lines: ['200 Bishopsgate', 'London EC2N 3AG', 'United Kingdom'],
    phone: '+44 20 7946 0102',
  },
  {
    city: 'New York',
    role: 'Americas',
    lines: ['200 Park Avenue, 32nd Floor', 'New York, NY 10166', 'United States'],
    phone: '+1 212 555 0188',
  },
  {
    city: 'Singapore',
    role: 'Asia Pacific',
    lines: ['8 Marina View', 'Singapore 018960', 'Singapore'],
    phone: '+65 6818 9042',
  },
];

const FAQS = [
  {
    q: 'How quickly will I get a reply?',
    a: 'Technical support is answered within one business day. Sales and partnership enquiries usually get a response within two business days. Anything involving a data-access or security question is triaged immediately.',
  },
  {
    q: 'What should I include in a support request?',
    a: 'The tenant subdomain, your account email, the exact error text, and the time it occurred. A screenshot helps enormously. If the issue is a failed sign-in, include the browser and the time of the last successful login.',
  },
  {
    q: 'Is my enquiry covered by a service-level agreement?',
    a: 'Only for contracted plans. If you have an SLA, quote the account identifier in your first message and it is attached to the incident record automatically.',
  },
  {
    q: 'How do I report a security vulnerability?',
    a: 'Do not open a public issue. Use the private security advisory form on the repository. We acknowledge reports within 24 hours and keep you informed until the issue is resolved.',
  },
  {
    q: 'Can I get help migrating an existing tenant?',
    a: 'Yes. Send us the current subdomains, the emoji branding and the number of members per tenant, and we will send back a migration plan with the data mapping for the `tenants` and `tenant_users` tables.',
  },
];

export default function ContactPage() {
  // Structured data for the contact page: the page type itself, the
  // organisation behind it, and the FAQ that appears further down.
  const jsonLd = structuredData({
    '@context': 'https://schema.org',
    '@graph': [organizationSchema(), contactPageSchema(), faqSchema(FAQS)],
  });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <SiteHeader />
      <ScrollProgress />

      {/* ───────────── Hero ───────────── */}
      <section className="relative overflow-hidden bg-[#0c2238]">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-40 left-1/4 h-[560px] w-[560px] rounded-full bg-[#0078E2]/25 blur-[100px]" />
          <div className="absolute -right-32 top-40 h-[420px] w-[420px] rounded-full bg-blue-400/15 blur-[100px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-blue-200 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Support team online
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Talk to a human.
              <br />
              <span className="bg-gradient-to-r from-[#4A9DFF] to-[#7DD3FC] bg-clip-text text-transparent">
                We&rsquo;ll sort it out.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-blue-100/70 sm:text-lg">
              Support, sales, billing or partnership — every enquiry lands with a
              named person who can actually resolve it. No ticket ping-pong, no
              chatbots.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="#enquiry"
                className="inline-flex items-center justify-center gap-2 rounded-none bg-[#005cb3] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-[#004A94] hover:shadow-blue-600/45 active:scale-[0.98]"
              >
                Send an enquiry
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="#channels"
                className="inline-flex items-center justify-center rounded-none border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:border-white/35 hover:bg-white/10"
              >
                Browse support channels
              </a>
            </div>

            <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { value: '< 1 day', label: 'First response' },
                { value: '24/7', label: 'Critical incidents' },
                { value: '99.99%', label: 'Platform uptime' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-none border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm"
                >
                  <dt className="text-2xl font-extrabold tracking-tight text-white">
                    {stat.value}
                  </dt>
                  <dd className="mt-1 text-xs font-medium uppercase tracking-wide text-blue-200/75">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ───────────── Channels ───────────── */}
      <section id="channels" className="scroll-mt-20 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#005cb3]">
              Support channels
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Right door, first time
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Pick the team that owns your question. Each channel is monitored
              by specialists rather than a shared queue.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {CHANNELS.map((channel) => (
              <div
                key={channel.title}
                className="group flex flex-col rounded-none border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#0078E2]/30 hover:shadow-xl hover:shadow-slate-200/60"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-none bg-gradient-to-br ${channel.accent} text-white shadow-lg transition-transform group-hover:scale-105`}
                >
                  <channel.icon className="h-5 w-5" aria-hidden="true" />
                </div>

                <h3 className="mt-4 text-base font-bold text-slate-900">{channel.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  {channel.description}
                </p>

                <a
                  href={`mailto:${channel.action}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#005cb3] transition-colors hover:text-[#004A94]"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  {channel.action}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Form + Details ───────────── */}
      <section id="enquiry" className="scroll-mt-20 border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
            {/* Form */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 sm:p-9">
              <div className="mb-7">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Send us a message
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Fields marked <span className="text-red-600">*</span> are required.
                  We reply to the address you give us.
                </p>
              </div>

              <ContactForm />
            </div>

            {/* Direct details */}
            <aside className="space-y-6">
              <div className="rounded-none border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-900">Direct contact</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Prefer your own email client? Reach us directly.
                </p>

                {/*
                  A definition list may only contain `<div>` wrappers, and a
                  `<dt>`/`<dd>` pair has to sit directly inside one of them.
                  The icon therefore lives inside the `<dt>` — that keeps the
                  markup valid and the layout identical.
                */}
                <dl className="mt-5 space-y-4">
                  <div>
                    <dt className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-[#0078E2]/10 text-[#005cb3]">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        General enquiries
                      </span>
                    </dt>
                    <dd className="mt-0.5 pl-12">
                      <a
                        href="mailto:hello@citgroup.example"
                        className="text-sm font-medium text-slate-900 transition-colors hover:text-[#005cb3]"
                      >
                        hello@citgroup.example
                      </a>
                    </dd>
                  </div>

                  <div>
                    <dt className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-[#0078E2]/10 text-[#005cb3]">
                        <Phone className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Priority line
                      </span>
                    </dt>
                    <dd className="mt-0.5 pl-12">
                      <a
                        href="tel:+442079460100"
                        className="text-sm font-medium text-slate-900 transition-colors hover:text-[#005cb3]"
                      >
                        +44 20 7946 0100
                      </a>
                    </dd>
                  </div>

                  <div>
                    <dt className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-[#0078E2]/10 text-[#005cb3]">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Support hours
                      </span>
                    </dt>
                    <dd className="mt-0.5 pl-12 text-sm font-medium text-slate-900">
                      Mon–Fri, 08:00–20:00 GMT
                    </dd>
                    <dd className="pl-12 text-xs text-slate-500">
                      Critical incidents are covered 24/7.
                    </dd>
                  </div>

                  <div>
                    <dt className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-[#0078E2]/10 text-[#005cb3]">
                        <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status page
                      </span>
                    </dt>
                    <dd className="mt-0.5 pl-12">
                      <a
                        href="#"
                        className="text-sm font-medium text-slate-900 transition-colors hover:text-[#005cb3]"
                      >
                        status.citgroup.example
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Commitment card */}
              <div className="rounded-none border border-[#0078E2]/20 bg-gradient-to-br from-[#0078E2]/[0.06] to-transparent p-6">
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <ShieldCheck className="h-5 w-5 text-[#005cb3]" aria-hidden="true" />
                  Our commitment to you
                </h3>
                <ul className="mt-4 space-y-3">
                  {[
                    'A named engineer on every enquiry, not a shared queue',
                    'Security issues triaged within 24 hours',
                    'Your details never sold, shared, or used for marketing',
                    'Enquiries retained for 12 months, then deleted',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                        aria-hidden="true"
                      />
                      <span className="text-sm leading-relaxed text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ───────────── Offices ───────────── */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#005cb3]">
              Offices
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Where we are
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Three regions, one support team. Follow the sun and your enquiry is
              always answered by someone awake.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {OFFICES.map((office) => (
              <div
                key={office.city}
                className="rounded-none border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-none bg-slate-900 text-white">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{office.city}</h3>
                    <p className="text-xs font-medium uppercase tracking-wide text-[#005cb3]">
                      {office.role}
                    </p>
                  </div>
                </div>

                <address className="mt-4 space-y-0.5 text-sm not-italic leading-relaxed text-slate-600">
                  {office.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </address>

                <a
                  href={`tel:${office.phone.replace(/\s/g, '')}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 transition-colors hover:text-[#005cb3]"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {office.phone}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── FAQ ───────────── */}
      <section className="border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#005cb3]">
              FAQ
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Before you write
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              The five questions we answer most often. If yours is not here,
              send it anyway — we like the interesting ones.
            </p>
          </div>

          <dl className="mt-12 divide-y divide-slate-200 overflow-hidden rounded-none border border-slate-200 bg-white shadow-sm">
            {FAQS.map((faq) => (
              <div key={faq.q} className="p-6 transition-colors hover:bg-slate-50">
                <dt className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-none bg-[#0078E2]/10 text-[#005cb3]">
                    <span className="text-xs font-bold">?</span>
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{faq.q}</h3>
                </dt>
                <dd className="mt-3 pl-9 text-sm leading-relaxed text-slate-600">
                  {faq.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───────────── Closing CTA ───────────── */}
      <section className="relative overflow-hidden bg-[#0c2238] py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-[#0078E2]/25 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Still stuck?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-blue-100/70">
            Browse the documentation first — most questions are answered there in
            under a minute. If not, we are one message away.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/#faq"
              className="inline-flex items-center justify-center gap-2 rounded-none bg-[#005cb3] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-[#004A94] active:scale-[0.98]"
            >
              Read the FAQ
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center rounded-none border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:border-white/35 hover:bg-white/10"
            >
              Create a tenant
            </Link>
          </div>

          <p className="mt-8 text-xs text-blue-200/75">
            Serving from {rootDomain} · Support available in English
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
