import type { Metadata } from 'next';

import { listSessions } from '@/lib/db/sessions';
import { requireAdminSession } from '@/app/auth/admin/login/actions';
import { revokeAllExceptAction, revokeSessionAction } from './actions';

export const metadata: Metadata = {
  title: 'Active Sessions',
  description: 'Manage your active admin sessions',
  robots: { index: false, follow: false },
};

export default async function SessionsPage() {
  await requireAdminSession();

  const sessions = await listSessions('admin_sessions');

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const mostRecentId =
    sessions.length > 0
      ? sessions.reduce((prev, current) =>
          current.createdAt.getTime() > prev.createdAt.getTime()
            ? current
            : prev
        ).id
      : null;

  async function handleRevokeSession(formData: FormData): Promise<void> {
    await revokeSessionAction(undefined, formData);
  }

  async function handleRevokeAllExcept(formData: FormData): Promise<void> {
    await revokeAllExceptAction(undefined, formData);
  }

  return (
    <div className="w-full xl:px-12 mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Active Sessions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review and revoke your active admin sessions. Revoking a session
            signs it out immediately.
          </p>
        </div>
        <form action={handleRevokeAllExcept} className="flex items-center gap-2">
          {mostRecentId && (
            <input type="hidden" name="keepSessionId" value={mostRecentId} />
          )}
          <button
            type="submit"
            className="rounded-none bg-[#005cb3] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#004A94] transition-colors"
          >
            Revoke all other sessions
          </button>
        </form>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-none border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            No active sessions found.
          </p>
        </div>
      ) : (
        <div className="rounded-none border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Session
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Created
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Expires
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => {
                const isExpired = session.expiresAt < now;
                const isMostRecent = session.createdAt.getTime() ===
                  Math.max(...sessions.map((s) => s.createdAt.getTime()));

                return (
                  <tr
                    key={session.id}
                    className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                      isMostRecent ? 'bg-[#0078E2]/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0078E2]/10 text-xs font-bold text-[#005cb3]">
                          {session.id.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {session.id}
                          </p>
                          {isMostRecent && (
                            <p className="text-xs text-[#005cb3] font-medium">
                              Current session
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(session.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {isExpired ? (
                        <span className="text-xs font-medium text-red-600">
                          Expired
                        </span>
                      ) : (
                        <span>
                          {new Date(session.expiresAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isExpired
                            ? 'bg-red-50 text-red-600'
                            : 'bg-[#0078E2]/10 text-[#005cb3]'
                        }`}
                      >
                        {isExpired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={handleRevokeSession} className="inline">
                        <input type="hidden" name="sessionId" value={session.id} />
                        <button
                          type="submit"
                          className={`rounded-none px-4 py-2 text-sm font-medium transition-colors ${
                            isExpired
                              ? 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                              : 'bg-[#005cb3] text-white hover:bg-[#004A94]'
                          }`}
                          disabled={isExpired}
                          aria-label={`Revoke session ${session.id}`}
                        >
                          Revoke
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
