import 'server-only';

import {
  apiErrors,
  enforceRateLimit,
  ok,
  requireAdminOrApiKey,
} from '@/lib/api';
import { getAdminSession } from '@/app/auth/admin/login/actions';
import { listSessions, revokeAllExcept } from '@/lib/db/sessions';

export const dynamic = 'force-dynamic';

type SessionTable = 'admin_sessions';

/**
 * Resolves the session table and the user ID to scope queries to.
 *
 * `requireAdminOrApiKey()` only returns `{ kind: 'session' }` without the
 * user payload, so we call `getAdminSession()` to obtain the `userId` when
 * the request is authenticated via a session cookie. API key callers have no
 * user context and therefore see all admin sessions.
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

  // API key — admin scope, no specific user.
  return { table: 'admin_sessions', userId: null, all: true };
}

/**
 * `GET /api/v1/sessions` — list all sessions for the authenticated user.
 *
 * Admin session cookie → `admin_sessions` filtered by `user_id`.
 * Machine key → all admin sessions (key holders are admin integrations).
 */
export async function GET() {
  const scope = await resolveAuthScope();
  if (!scope) return apiErrors.unauthorized();

  const limited = await enforceRateLimit('api:sessions_list', 30, 60 * 1000);
  if (limited) return limited;

  const sessions = await listSessions(scope.table, {
    userId: scope.userId ?? undefined,
    all: scope.all,
  });

  return ok({
    sessions: sessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      tenantId: s.tenantId,
      createdAt: s.createdAt.toISOString(),
      expiresAt: new Date(s.expiresAt).toISOString(),
    })),
    count: sessions.length,
  });
}

/**
 * `DELETE /api/v1/sessions` — revoke all sessions except the current one
 * ("sign out everywhere else").
 *
 * The request body may carry `{ keepSessionId }` to identify the session to
 * preserve. Without it, every session in scope is revoked: a session cookie
 * revokes that user's sessions, while an API key — admin scope, no user
 * context — revokes every admin session.
 */
export async function DELETE(request: Request) {
  const scope = await resolveAuthScope();
  if (!scope) return apiErrors.unauthorized();

  const limited = await enforceRateLimit('api:sessions_revoke_all', 10, 60 * 1000);
  if (limited) return limited;

  let body: { keepSessionId?: string } | null = null;
  try {
    body = (await request.json()) ?? null;
  } catch {
    // No body is valid — revoke everything in scope.
  }

  const keepSessionId = body?.keepSessionId ?? null;
  const revoked = await revokeAllExcept(
    scope.table,
    scope.all ? null : scope.userId,
    keepSessionId
  );

  return ok({ revoked });
}
