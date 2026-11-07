import type { Metadata } from 'next';
import { requireAdminSession } from '@/app/auth/admin/login/actions';
import { adminUrl } from '@/lib/admin-path';
import { maskMessage } from '@/lib/sam/filter';
import { getMySQLPool } from '@/lib/db/mysql';

export const metadata: Metadata = {
  title: 'SAM Escalations',
  description: 'Support escalation overview',
  robots: { index: false, follow: false },
};

interface EscalationDisplay {
  id: string;
  message: string;
  resolved: boolean;
  createdAt: Date;
  conversation_id: string;
  subdomain: string;
  messageCount: number;
}

export default async function SAMAdminPage() {
  // Require admin auth — server-side guard using the shared module.
  await requireAdminSession();

  const pool = await getMySQLPool();

  // Real escalations joined with conversations for subdomain context.
  const [escalationRows] = await pool.execute(
    `SELECT e.id, e.reason, e.resolved, e.created_at, e.conversation_id, c.subdomain
     FROM escalations e
     JOIN conversations c ON c.id = e.conversation_id
     ORDER BY e.created_at DESC`
  );

  // Message counts per conversation, shown as additional context in the table.
  const [countRows] = await pool.execute(
    `SELECT conversation_id, COUNT(*) as message_count
     FROM messages
     GROUP BY conversation_id`
  );

  const messageCounts = new Map(
    (countRows as Array<{ conversation_id: string; message_count: number }>).map(
      (row) => [row.conversation_id, Number(row.message_count)]
    )
  );

  const escalations: EscalationDisplay[] = (
    escalationRows as Array<{
      id: string;
      reason: string;
      resolved: number;
      created_at: Date;
      conversation_id: string;
      subdomain: string;
    }>
  ).map((row) => ({
    id: row.id,
    message: maskMessage(row.reason),
    resolved: Boolean(row.resolved),
    createdAt: row.created_at,
    conversation_id: row.conversation_id,
    subdomain: row.subdomain,
    messageCount: messageCounts.get(row.conversation_id) ?? 0,
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
          {escalations.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No escalations found.
            </p>
          ) : (
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
                {escalations.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700">{item.id}</td>
                    <td className="px-4 py-3 text-slate-700 font-mono text-xs">
                      {item.message}
                      {item.messageCount > 0 && (
                        <div className="mt-1 text-[10px] text-slate-500">
                          {item.messageCount} message{item.messageCount === 1 ? '' : 's'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.resolved ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Resolved</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Escalated</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section aria-label="PII filter status" className="mt-6 bg-blue-50 border border-[#005cb3]/20 rounded-xl p-4">
          <h2 className="font-semibold text-[#005cb3] mb-1">Filter status</h2>
          <p className="text-xs text-slate-600">Messages masked via lib/sam/filter (sanitizePII, containsSecret, maskMessage). No PII or secret values exposed in this view.</p>
        </section>
      </div>
    </main>
  );
}
