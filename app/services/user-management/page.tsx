import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Users, ShieldCheck, Mail, Clock } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ScrollProgress } from '@/components/scroll-progress';
import { rootDomain } from '@/lib/utils';
import { pageMetadata, structuredData, organizationSchema, softwareApplicationSchema } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'User Management | CITGROUP TENANCY SYSTEM',
  description:
    'Role-based access control for tenant administrators and end users. Granular permission sets, session management, invite and onboard users, access history tracking.',
  path: '/services/user-management',
  keywords: [
    'user management',
    'role-based access control',
    'RBAC',
    'tenant users',
    'CITGROUP tenancy services',
  ],
});

const USER_MANAGEMENT_FEATURES = [
  {
    icon: Users,
    title: 'Granular Permission Sets',
    description:
      'Role-based access control for tenant administrators and end users. Define exactly what each user can see and do within your workspace.',
  },
  {
    icon: ShieldCheck,
    title: 'Session Management',
    description:
      'Monitor active sessions, revoke access when needed, and track user login activity across your tenant workspace.',
  },
  {
    icon: Mail,
    title: 'Invite & Onboard Users',
    description:
      'Invite new members to your tenant with temporary passwords. They&rsquo;ll be prompted to change their password on first sign in.',
  },
  {
    icon: Clock,
    title: 'Access History Tracking',
    description:
      'View when users last logged in, what actions they performed, and when their sessions expire.',
  },
];

export default function UserManagementPage() {
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
                User Management
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Role-Based Access Control
              </h2>
              <p className="mt-6 text-base leading-relaxed text-slate-600 sm:text-lg">
                Manage tenant administrators and end users with granular permission sets. Control
                exactly what each user can see and do within your workspace.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {USER_MANAGEMENT_FEATURES.map((feature) => (
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
                User Roles & Permissions
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                Define what each user can do within your tenant workspace with role-based access control.
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
                      Sign in, use workspace, update own profile, submit support requests
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
