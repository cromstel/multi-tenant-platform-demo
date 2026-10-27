'use client';

import { useActionState, useState } from 'react';
import { X, Loader2, UserPlus, Shield, Trash2, UserCheck, UserX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  changeMemberRoleAction,
  inviteMemberAction,
  removeMemberAction,
  setMemberActiveAction,
  type MemberActionState,
} from './actions';

type Member = {
  id: number;
  email: string;
  role: string;
  isActive: boolean;
};

const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
];

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-violet-100 text-violet-700',
  admin: 'bg-blue-100 text-blue-700',
  member: 'bg-slate-100 text-slate-600',
};

/**
 * The member management panel.
 *
 * One modal handles every operation — inviting, changing a role, suspending
 * and removing. Each action is a separate Server Action that re-checks the
 * session, so the modal is only a convenience.
 */
export function MemberManager({
  subdomain,
  members,
  onClose,
}: {
  subdomain: string;
  members: Member[];
  onClose: () => void;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);

  const [inviteState, inviteAction, inviting] = useActionState<MemberActionState, FormData>(
    inviteMemberAction,
    {}
  );
  const [roleState, roleAction, changingRole] = useActionState<MemberActionState, FormData>(
    changeMemberRoleAction,
    {}
  );
  const [activeState, activeAction, togglingActive] = useActionState<MemberActionState, FormData>(
    setMemberActiveAction,
    {}
  );
  const [removeState, removeAction, removing] = useActionState<MemberActionState, FormData>(
    removeMemberAction,
    {}
  );

  const busy = inviting || changingRole || togglingActive || removing;
  const feedback = inviteState.error || roleState.error || activeState.error || removeState.error;
  const success = inviteState.success || roleState.success || activeState.success || removeState.success;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Members of ${subdomain}`}
      onClick={onClose}
    >
      <div
        className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white p-5">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
              Members
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {members.length} member{members.length === 1 ? '' : 's'} in{' '}
              <span className="font-medium text-slate-700">{subdomain}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close member manager"
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Feedback */}
          {feedback && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {feedback}
            </p>
          )}
          {success && (
            <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          )}

          {/* Invite */}
          {inviteOpen ? (
            <form action={inviteAction} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input type="hidden" name="subdomain" value={subdomain} />
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  placeholder="new.member@company.com"
                  required
                  className="h-11 bg-white border-slate-200 focus:border-[#0078E2] focus:ring-2 focus:ring-[#0078E2]/20"
                />
                <select
                  id="invite-role"
                  name="role"
                  defaultValue="member"
                  className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[#0078E2] focus:outline-none focus:ring-2 focus:ring-[#0078E2]/20"
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={inviting}
                  className="bg-[#005cb3] text-white hover:bg-[#004A94]"
                >
                  {inviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                  )}
                  Add member
                </Button>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setInviteOpen(true)}
              className="w-full border-dashed"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Invite a member
            </Button>
          )}

          {/* Member list */}
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {members.length === 0 ? (
              <li className="p-6 text-center text-sm text-slate-500">
                No members yet.
              </li>
            ) : (
              members.map((member) => (
                <li key={member.id} className="flex flex-wrap items-center gap-3 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0078E2]/10 text-xs font-bold text-[#005cb3]">
                    {member.email.charAt(0).toUpperCase()}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {member.email}
                    </p>
                    {!member.isActive && (
                      <p className="text-xs text-amber-700">Suspended</p>
                    )}
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      ROLE_BADGE[member.role] ?? ROLE_BADGE.member
                    }`}
                  >
                    {member.role}
                  </span>

                  {/* Role change */}
                  <form action={roleAction} className="flex items-center gap-1.5">
                    <input type="hidden" name="subdomain" value={subdomain} />
                    <input type="hidden" name="userId" value={member.id} />
                    <select
                      name="role"
                      defaultValue={member.role}
                      disabled={busy}
                      aria-label={`Role for ${member.email}`}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:border-[#0078E2] focus:outline-none focus:ring-1 focus:ring-[#0078E2]/30 disabled:opacity-50"
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      aria-label={`Save role for ${member.email}`}
                      className="h-8 px-2 text-[#005cb3] hover:bg-[#004A94]/10"
                    >
                      {changingRole ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </Button>
                  </form>

                  {/* Suspend / restore */}
                  <form action={activeAction}>
                    <input type="hidden" name="subdomain" value={subdomain} />
                    <input type="hidden" name="userId" value={member.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={member.isActive ? 'false' : 'true'}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      aria-label={
                        member.isActive
                          ? `Suspend ${member.email}`
                          : `Restore ${member.email}`
                      }
                      className="h-8 w-8 p-0 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                    >
                      {togglingActive ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : member.isActive ? (
                        <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </Button>
                  </form>

                  {/* Remove */}
                  <form action={removeAction}>
                    <input type="hidden" name="subdomain" value={subdomain} />
                    <input type="hidden" name="userId" value={member.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      aria-label={`Remove ${member.email}`}
                      className="h-8 w-8 p-0 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    >
                      {removing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </Button>
                  </form>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
