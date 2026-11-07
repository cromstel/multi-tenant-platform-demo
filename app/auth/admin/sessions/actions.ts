'use server';

import 'server-only';

import { getAdminSession } from '@/app/auth/admin/login/actions';
import { revalidateAdmin } from '@/lib/admin-path';
import { revokeAllExcept, revokeSession } from '@/lib/db/sessions';

export type SessionActionState = {
  error?: string;
  success?: string;
};

async function requireAdminUserId(): Promise<number | null> {
  const session = await getAdminSession();
  return session ? session.userId : null;
}

/**
 * Revokes a single session belonging to the current admin user.
 */
export async function revokeSessionAction(
  _prevState: SessionActionState | undefined,
  formData: FormData
): Promise<SessionActionState> {
  const userId = await requireAdminUserId();
  if (!userId) {
    return { error: 'Your session has expired. Sign in again to continue.' };
  }

  const sessionId = formData.get('sessionId');
  if (typeof sessionId !== 'string' || !sessionId) {
    return { error: 'A session ID is required.' };
  }

  const deleted = await revokeSession('admin_sessions', sessionId, userId);
  if (!deleted) {
    return { error: 'That session could not be found or is not yours to revoke.' };
  }

  revalidateAdmin();
  return { success: 'Session revoked.' };
}

/**
 * Revokes all sessions for the current admin user except the one identified
 * by `keepSessionId` ("sign out everywhere else").
 */
export async function revokeAllExceptAction(
  _prevState: SessionActionState | undefined,
  formData: FormData
): Promise<SessionActionState> {
  const userId = await requireAdminUserId();
  if (!userId) {
    return { error: 'Your session has expired. Sign in again to continue.' };
  }

  const keepSessionId = formData.get('keepSessionId');
  const keepId = typeof keepSessionId === 'string' ? keepSessionId : null;

  const revoked = await revokeAllExcept('admin_sessions', userId, keepId);

  revalidateAdmin();
  return {
    success:
      revoked === 0
        ? 'No other sessions to revoke.'
        : `${revoked} other session${revoked === 1 ? '' : 's'} revoked.`,
  };
}
