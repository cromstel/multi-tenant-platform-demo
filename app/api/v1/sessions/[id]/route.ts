import 'server-only';

import {
  apiErrors,
  ok,
  requireAdminOrApiKey,
} from '@/lib/api';
import { getAdminSession } from '@/app/auth/admin/login/actions';
import { getMySQLPool } from '@/lib/db/mysql';
import {
  revokeSession,
  sessionExists,
} from '@/lib/db/sessions';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

type SessionTable = 'admin_sessions';

/**
 * Resolves the authenticated user's scope (table + userId or all-sessions).
 * Returns `null` when unauthenticated.
 */
async function resolveAuthScope(): Promise<{
  table: SessionTable;
  userId: number | null;
  all: boolean;
} | null> {
  const auth = await requireAdminOrApiKey();
  if (!auth) return null;

  if (auth.kind === 'session') {
    const session = await getAdminSession();
    if (!session) return null;
    return { table: 'admin_sessions', userId: session.userId, all: false };
  }

  return { table: 'admin_sessions', userId: null, all: true };
}

/**
 * `DELETE /api/v1/sessions/{id}` — revoke a single session by ID.
 *
 * Session-authenticated callers can only revoke their own sessions (ownership
 * check on `user_id`). API key callers (admin scope) may revoke any admin
 * session.
 *
 * Returns 404 when the session does not exist, 403 when it exists but the
 * caller is not the owner, and 200 on successful revocation.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const scope = await resolveAuthScope();
  if (!scope) return apiErrors.unauthorized();

  const { id } = await context.params;

  const exists = await sessionExists(scope.table, id);
  if (!exists) return apiErrors.notFound('Session');

  // Session-authenticated callers must own the session they revoke.
  // API key callers have admin scope and may revoke any session.
  if (!scope.all) {
    const deleted = await revokeSession(scope.table, id, scope.userId!);
    if (!deleted) {
      return apiErrors.forbidden();
    }
    return ok({ revoked: true, id });
  }

  const pool = await getMySQLPool();
  const [result] = await pool.execute(
    `DELETE FROM ${scope.table} WHERE id = ?`,
    [id]
  );
  const affected = (result as { affectedRows: number }).affectedRows;

  if (affected === 0) return apiErrors.notFound('Session');

  return ok({ revoked: true, id });
}
