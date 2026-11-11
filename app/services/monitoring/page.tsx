import type { Metadata } from 'next';
import { Gauge, Clock, TrendingUp, ShieldCheck } from 'lucide-react';
import { HeroBanner } from '@/components/hero-banner';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ScrollProgress } from '@/components/scroll-progress';
import { pageMetadata, structuredData, organizationSchema, softwareApplicationSchema } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Monitoring & Alerts | CITGROUP TENANCY SYSTEM',
  description:
    'Real-time system health monitoring with customizable alert thresholds. Dashboard for all tenants, performance metrics, security event tracking, and capacity planning.',
  path: '/services/monitoring',
  keywords: [
    'monitoring',
    'alerts',
    'system health',
    'tenant monitoring',
    'performance metrics',
    'CITGROUP tenancy services',
  ],
});

const MONITORING_FEATURES = [
  {
    icon: Gauge,
    title: 'Dashboard for All Tenants',
    description:
      'Real-time visibility into tenant growth, user counts, active sessions, and system health from a single command center.',
  },
  {
    icon: TrendingUp,
    title: 'Performance Metrics',
    description:
      'Track response times, error rates, and resource utilization across all tenant workloads.',
  },
  {
    icon: ShieldCheck,
    title: 'Security Event Tracking',
    description:
      'Monitor authentication events, privilege escalations, and security-related activities across all tenants.',
  },
  {
    icon: Clock,
    title: 'Capacity Planning',
    description:
      'Forecast resource needs based on historical usage patterns and plan infrastructure scaling accordingly.',
  },
];

export default function MonitoringPage() {
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
              Monitoring & Alerts
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Real-Time System Monitoring
            </h2>
            <p className="mt-6 text-base leading-relaxed text-blue-100/80 sm:text-lg">
              Real-time system health monitoring with customizable alert thresholds. Dashboard for
              all tenants, performance metrics, security event tracking, and capacity planning.
            </p>
          </div>
        </HeroBanner>

        <section className="py-20 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {MONITORING_FEATURES.map((feature) => (
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
                Alert Configuration
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                Configure customizable alert thresholds to stay informed about platform health and
                security events.
              </p>
            </div>

            <div className="mt-12 overflow-hidden rounded-none border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Alert Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Trigger</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Notification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">High Error Rate</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      Error rate exceeds 5% for 5 minutes
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">Email, Slack</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">High CPU Usage</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      CPU usage exceeds 80% for 10 minutes
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">Email, Slack</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">High Memory Usage</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      Memory usage exceeds 85% for 10 minutes
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">Email, Slack</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">Failed Logins</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      5 failed logins in 15 minutes
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">Email, Slack</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
