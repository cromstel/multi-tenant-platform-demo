import type { Metadata } from 'next';
import { ShieldCheck, Users, Gauge, Database } from 'lucide-react';
import { HeroBanner } from '@/components/hero-banner';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ScrollProgress } from '@/components/scroll-progress';
import { pageMetadata, structuredData, organizationSchema, softwareApplicationSchema } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Tenant Management | CITGROUP TENANCY SYSTEM',
  description:
    'Comprehensive dashboard for monitoring and controlling all tenant environments. Real-time usage analytics, resource monitoring, security posture tracking, and billing management.',
  path: '/services/tenant-management',
  keywords: [
    'tenant management',
    'tenant dashboard',
    'member management',
    'admin dashboard',
    'CITGROUP tenancy services',
  ],
});

const TENANT_FEATURES = [
  {
    icon: Users,
    title: 'Member Invitation',
    description:
      'Invite new members to a tenant with temporary passwords. Assign roles — owner, admin, or member — and manage access across your workspace.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access Control',
    description:
      'Granular permission sets for tenant administrators and end users. Control what each member can see and do within the workspace.',
  },
  {
    icon: Database,
    title: 'Session Management',
    description:
      'Monitor active sessions, revoke access when needed, and track user login activity across your tenant workspace.',
  },
  {
    icon: Gauge,
    title: 'Usage Analytics',
    description:
      'Real-time dashboards showing tenant growth, user activity, and resource consumption across all your environments.',
  },
];

export default function TenantManagementPage() {
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
              Tenant Management
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Member Management & Tenant Control
            </h1>
            <p className="mt-6 text-base leading-relaxed text-blue-100/80 sm:text-lg">
              Manage members, roles, and permissions across your tenant workspace. Real-time
              visibility into user activity and resource usage.
            </p>
          </div>
        </HeroBanner>

        <section className="py-20 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {TENANT_FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-none border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-none bg-gradient-to-br from-[#0078E2] to-[#5B9CF5] text-white shadow-lg transition-transform duration-300 group-hover:scale-105">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h2 className="mt-5 text-lg font-bold text-slate-900">
                    {feature.title}
                  </h2>
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
                Role-Based Access Control
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                Granular permission sets for tenant administrators and end users.
              </p>
            </div>

            <div className="mt-12 overflow-hidden rounded-none border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Can Do</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Cannot Do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">Owner</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      Full control — billing, branding, members, settings, delete tenant
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">None</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">Admin</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      Manage members, moderate content, access admin features
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      Change billing, delete tenant, change owner role
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">Member</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      Use workspace, update own profile, submit support requests
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      Manage other users, change settings, access billing
                    </td>
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
