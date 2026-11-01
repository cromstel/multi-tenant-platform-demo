import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  Gauge,
  ShieldCheck,
  Server,
  Users,
  Workflow,
} from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ScrollProgress } from '@/components/scroll-progress';
import { rootDomain } from '@/lib/utils';
import {
  pageMetadata,
  structuredData,
  organizationSchema,
  softwareApplicationSchema,
} from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Services | Multi-Tenant Platform',
  description:
    'Provisioning, management, and analytics services for CITGROUP TENANCY SYSTEM. One platform, many capabilities.',
  path: '/services',
  keywords: [
    'multi-tenant platform services',
    'SaaS services',
    'tenant management',
    'provisioning services',
  ],
});

const SERVICES = [
  {
    icon: Server,
    title: 'Provisioning API',
    description: 'RESTful API for programmatic tenant creation and management through a single endpoint.',
    points: [
      'Instant subdomain creation',
      'Automatic storage allocation',
      'Branded workspace setup',
      'Idempotent operations',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Tenant Management',
    description: 'Comprehensive dashboard for monitoring and controlling all tenant environments.',
    points: [
      'Real-time usage analytics',
      'Resource monitoring',
      'Security posture tracking',
      'Billing and subscription management',
    ],
  },
  {
    icon: Database,
    title: 'Data Isolation',
    description: 'Guaranteed data boundaries with MySQL-backed relational storage and strict tenant scoping.',
    points: [
      'Foreign key enforced boundaries',
      'Automatic tenant scoping',
      'Transactional integrity',
      'No shared state leakage',
    ],
  },
  {
    icon: Gauge,
    title: 'Monitoring & Alerts',
    description: 'Real-time system health monitoring with customizable alert thresholds.',
    points: [
      'Dashboard for all tenants',
      'Performance metrics',
      'Security event tracking',
      'Capacity planning',
    ],
  },
  {
    icon: Users,
    title: 'User Management',
    description: 'Role-based access control for tenant administrators and end users.',
    points: [
      'Granular permission sets',
      'Session management',
      'Invite and onboard users',
      'Access history tracking',
    ],
  },
  {
    icon: Workflow,
    title: 'Automation & Integrations',
    description: 'Webhooks and event-driven workflows for custom tenant experiences.',
    points: [
      'Event-driven notifications',
      'Custom workflow triggers',
      'Third-party integrations',
      'API webhooks',
    ],
  },
];

export default function ServicesPage() {
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
                Services
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Platform services for multi-tenant success
              </h2>
              <p className="mt-6 text-base leading-relaxed text-slate-600 sm:text-lg">
                CITGROUP TENANCY SYSTEM provides comprehensive services that power every aspect of your multi-tenant SaaS platform. From initial provisioning to ongoing management, we handle the infrastructure so you can focus on your customers.
              </p>
            </div>
          </div>
        </section>

          <section className="py-20 sm:py-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
              <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
                {SERVICES.map((service) => (
                  <div
                    key={service.title}
                    className="rounded-none border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-none bg-gradient-to-br from-[#0078E2] to-[#5B9CF5] text-white shadow-lg transition-transform duration-300 group-hover:scale-105">
                      <service.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-slate-900">
                      {service.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {service.description}
                    </p>
                    <ul className="mt-5 space-y-2.5">
                      {service.points.map((point) => (
                        <li key={point} className="flex items-start gap-2.5">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                          <span className="text-sm leading-relaxed text-slate-700">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
              <div className="text-center">
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  Why choose our services
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                  We build more than just a platform - we provide the complete service ecosystem for multi-tenant success. Our services are designed to work seamlessly together, with consistent security, reliability, and performance across all tenant boundaries.
                </p>
              </div>
            </div>
          </section>

          <section className="py-20 sm:py-24">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
              <div className="text-center">
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center justify-center gap-2 rounded-none bg-[#005cb3] px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-[#004A94] hover:shadow-blue-600/45 active:scale-[0.98]"
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