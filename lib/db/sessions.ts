import 'server-only';

import { getMySQLPool } from '@/lib/db/mysql';

export type SessionRow = {
  id: string;
  userId: number;
  tenantId: number | null;
  /** Milliseconds since the epoch (BIGINT column). */
  expiresAt: number;
  createdAt: Date;
};

type SessionTable = 'admin_sessions' | 'tenant_sessions';

/**
 * Lists sessions from the given table, optionally filtered by user and/or tenant.
 *
 * When `all` is true, no user filter is applied — used by API key callers that
 * have admin scope but no specific user context.
 */
export async function listSessions(
  table: SessionTable,
  options: {
    userId?: number;
    tenantId?: number;
    all?: boolean;
  } = {}
): Promise<SessionRow[]> {
  const pool = await getMySQLPool();
  const { userId, tenantId, all = false } = options;

  const baseColumns =
    table === 'admin_sessions'
      ? 'id, user_id, NULL as tenant_id, expires_at, created_at'
      : 'id, user_id, tenant_id, expires_at, created_at';

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (!all && userId !== undefined) {
    conditions.push('user_id = ?');
    params.push(userId);
  }
  if (tenantId !== undefined) {
    conditions.push('tenant_id = ?');
    params.push(tenantId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT ${baseColumns}
    FROM ${table}
    ${where}
    ORDER BY created_at DESC
  `;

  const [rows] = await pool.execute(sql, params);

  return (rows as Array<{
    id: string;
    user_id: number;
    tenant_id: number | null;
    expires_at: number;
    created_at: Date;
  }>).map((row) => ({
    id: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

/**
 * Revokes a single session by ID, only when it belongs to the given user.
 *
 * Returns `true` when a row was deleted. Returns `false` when no matching
 * session existed for that user — callers distinguish 404 (session doesn't
 * exist at all) from 403 (session exists but belongs to another user) by
 * checking `sessionExists()` first.
 */
export async function revokeSession(
  table: SessionTable,
  sessionId: string,
  userId: number,
  tenantId?: number
): Promise<boolean> {
  const pool = await getMySQLPool();

  const conditions: string[] = ['id = ?', 'user_id = ?'];
  const params: (string | number)[] = [sessionId, userId];

  if (tenantId !== undefined) {
    conditions.push('tenant_id = ?');
    params.push(tenantId);
  }

  const sql = `DELETE FROM ${table} WHERE ${conditions.join(' AND ')}`;

  const [result] = await pool.execute(sql, params);
  return (result as { affectedRows: number }).affectedRows > 0;
}

/**
 * Returns `true` when a session with the given ID exists in the table,
 * regardless of which user owns it. Used to distinguish 404 from 403.
 */
export async function sessionExists(table: SessionTable, sessionId: string): Promise<boolean> {
  const pool = await getMySQLPool();

  const [rows] = await pool.execute(
    `SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`,
    [sessionId]
  );

  return (rows as Array<{ 1: number }>).length > 0;
}

/**
 * Revokes all sessions for a user except the one with `exceptId`.
 *
 * When `exceptId` is null, all sessions for the user are revoked.
 * Returns the number of rows deleted.
 */
export async function revokeAllExcept(
  table: SessionTable,
  userId: number,
  exceptId: string | null,
  tenantId?: number
): Promise<number> {
  const pool = await getMySQLPool();

  const conditions: string[] = ['user_id = ?'];
  const params: (string | number)[] = [userId];

  if (exceptId) {
    conditions.push('id != ?');
    params.push(exceptId);
  }
  if (tenantId !== undefined) {
    conditions.push('tenant_id = ?');
    params.push(tenantId);
  }

  const sql = `DELETE FROM ${table} WHERE ${conditions.join(' AND ')}`;

  const [result] = await pool.execute(sql, params);
  return (result as { affectedRows: number }).affectedRows;
}
