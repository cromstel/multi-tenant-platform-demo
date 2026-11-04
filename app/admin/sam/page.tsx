import type { Metadata } from 'next';
import { requireAdminSession } from '@/app/auth/admin/login/actions';
import { adminUrl } from '@/lib/admin-path';
import { maskMessage } from '@/lib/sam/filter';

export const metadata: Metadata = {
  title: 'SAM Escalations',
  description: 'Support escalation overview',
  robots: { index: false, follow: false },
};

export default async function SAMAdminPage() {
  // Require admin auth — server-side guard using the shared module.
  await requireAdminSession();

  // Queries only the SAM-related data; no contact/auth/session DB access.
  // For demonstration, using safe in-memory representation; in production
  // this would query the sam_messages / sam_escalations tables via mysql.
  const escalations = [
    { id: 1, message: 'User reported billing issue with account.', escalated: true, createdAt: new Date().toISOString() },
    { id: 2, message: 'Request for feature demo.', escalated: false, createdAt: new Date().toISOString() },
  ];

  const masked = escalations.map((e) => ({
    ...e,
    message: maskMessage(e.message),
  }));

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Support Escalations</h1>
        <p className="text-sm text-slate-600 mb-6">Active SAM messages and escalation status.</p>

        <nav aria-label="Admin navigation" className="mb-6 flex gap-3 text-sm">
          <a href={adminUrl()} className="text-[#005cb3] hover:text-[#004A94] underline">Dashboard</a>
          <a href={adminUrl('/settings')} className="text-[#005cb3] hover:text-[#004A94] underline">Settings</a>
          <a href={adminUrl('/members')} className="text-[#005cb3] hover:text-[#004A94] underline">Members</a>
        </nav>

        <section aria-label="Escalation list" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-700">ID</th>
                <th className="text-left px-4 py-3 font-medium text-slate-700">Message (masked)</th>
                <th className="text-left px-4 py-3 font-medium text-slate-700">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-700">Created</th>
              </tr>
            </thead>
            <tbody>
              {masked.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-700">{item.id}</td>
                  <td className="px-4 py-3 text-slate-700 font-mono text-xs">{item.message}</td>
                  <td className="px-4 py-3">
                    {item.escalated ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Escalated</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-label="PII filter status" className="mt-6 bg-blue-50 border border-[#005cb3]/20 rounded-xl p-4">
          <h2 className="font-semibold text-[#005cb3] mb-1">Filter status</h2>
          <p className="text-xs text-slate-600">Messages masked via lib/sam/filter (sanitizePII, containsSecret, maskMessage). No PII or secret values exposed in this view.</p>
        </section>
      </div>
    </main>
  );
}
