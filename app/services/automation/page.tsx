import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Workflow, Server, ShieldCheck, Mail } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ScrollProgress } from '@/components/scroll-progress';
import { rootDomain } from '@/lib/utils';
import { pageMetadata, structuredData, organizationSchema, softwareApplicationSchema } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Automation & Integrations | CITGROUP TENANCY SYSTEM',
  description:
    'Webhooks and event-driven workflows for custom tenant experiences. Event-driven notifications, custom workflow triggers, third-party integrations, API webhooks.',
  path: '/services/automation',
  keywords: [
    'automation',
    'integrations',
    'webhooks',
    'workflows',
    'tenant experiences',
    'CITGROUP tenancy services',
  ],
});

const AUTOMATION_FEATURES = [
  {
    icon: Workflow,
    title: 'Event-Driven Notifications',
    description:
      'Automatically notify stakeholders when specific events occur in your tenant — new user sign-ups, failed logins, billing events, and more.',
  },
  {
    icon: Server,
    title: 'Custom Workflow Triggers',
    description:
      'Define custom triggers that fire actions based on tenant events. Build automated workflows that respond to platform events.',
  },
  {
    icon: ShieldCheck,
    title: 'Third-Party Integrations',
    description:
      'Connect your tenant workspace with third-party services and tools. Sync data, trigger actions, and extend platform capabilities.',
  },
  {
    icon: Mail,
    title: 'API Webhooks',
    description:
      'Receive real-time HTTP callbacks when events occur in your tenant. Build custom integrations that respond to platform events instantly.',
  },
];

export default function AutomationPage() {
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
                Automation & Integrations
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Event-Driven Workflows
              </h2>
              <p className="mt-6 text-base leading-relaxed text-slate-600 sm:text-lg">
                Webhooks and event-driven workflows for custom tenant experiences. Receive real-time
                notifications, trigger custom actions, and integrate with third-party services.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {AUTOMATION_FEATURES.map((feature) => (
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
                Webhook Events
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                Subscribe to platform events and receive real-time HTTP callbacks when they occur.
              </p>
            </div>

            <div className="mt-12 overflow-hidden rounded-none border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Event</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">tenant.created</td>
                    <td className="px-4 py-3 text-sm text-slate-700">Fired when a new tenant is provisioned</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">user.created</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      Fired when a new user joins a tenant
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">user.login</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      Fired when a user successfully signs in
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">user.logout</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      Fired when a user signs out
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">contact.created</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      Fired when a contact enquiry is submitted
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="text-center">
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center gap-2 rounded-none bg-[#005cb3] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-[#004A94] active:scale-[0.98]"
                >
                  Start your free trial
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:border-white/35 hover:bg-white/10"
                >
                  Talk to sales
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <p className="mt-8 text-xs text-blue-200/75">
                Serving from {rootDomain} · Built and operated by CITGROUP
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
