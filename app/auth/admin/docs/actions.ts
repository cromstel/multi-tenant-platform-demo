'use server';

import { getAdminSession } from '@/app/auth/admin/login/actions';
import { getMySQLPool } from '@/lib/db/mysql';

export type DocSectionRow = {
  id: number;
  role: string;
  title: string;
  body: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

export type DocActionState = {
  error?: string;
  success?: string;
};

const VALID_ROLES: ReadonlyArray<'owner' | 'admin' | 'member'> = [
  'owner',
  'admin',
  'member',
];

async function requireAdmin(): Promise<void> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error('Admin session required.');
  }
}

/**
 * Fetches all documentation sections ordered by role then sort order.
 * Safe to call directly from a Server Component.
 */
export async function getDocSections(): Promise<DocSectionRow[]> {
  const pool = await getMySQLPool();
  const [rows] = await pool.execute(
    `SELECT id, role, title, body, sort_order, created_at, updated_at
     FROM docs_sections
     ORDER BY FIELD(role, 'owner', 'admin', 'member'), sort_order ASC, id ASC`
  );
  return (rows as DocSectionRow[]).map((row) => ({
    id: row.id,
    role: row.role,
    title: row.title,
    body: row.body,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function createDocSectionAction(
  _prevState: DocActionState,
  formData: FormData
): Promise<DocActionState> {
  await requireAdmin();

  const role = (formData.get('role') as string) || '';
  const title = (formData.get('title') as string) || '';
  const body = (formData.get('body') as string) || '';
  const sortOrder = Number.parseInt(
    (formData.get('sort_order') as string) || '0',
    10
  );

  if (!VALID_ROLES.includes(role as 'owner' | 'admin' | 'member')) {
    return { error: 'Invalid role.' };
  }
  if (!title.trim()) {
    return { error: 'Title is required.' };
  }
  if (!body.trim()) {
    return { error: 'Body is required.' };
  }
  if (!Number.isFinite(sortOrder)) {
    return { error: 'Sort order must be a number.' };
  }

  try {
    const pool = await getMySQLPool();
    await pool.execute(
      `INSERT INTO docs_sections (role, title, body, sort_order)
       VALUES (?, ?, ?, ?)`,
      [role, title.trim(), body.trim(), sortOrder]
    );
    return { success: 'Documentation section created.' };
  } catch {
    return { error: 'Failed to create section. Please try again.' };
  }
}

export async function updateDocSectionAction(
  _prevState: DocActionState,
  formData: FormData
): Promise<DocActionState> {
  await requireAdmin();

  const id = Number.parseInt((formData.get('id') as string) || '0', 10);
  const role = (formData.get('role') as string) || '';
  const title = (formData.get('title') as string) || '';
  const body = (formData.get('body') as string) || '';
  const sortOrder = Number.parseInt(
    (formData.get('sort_order') as string) || '0',
    10
  );

  if (!id) {
    return { error: 'Invalid section.' };
  }
  if (!VALID_ROLES.includes(role as 'owner' | 'admin' | 'member')) {
    return { error: 'Invalid role.' };
  }
  if (!title.trim()) {
    return { error: 'Title is required.' };
  }
  if (!body.trim()) {
    return { error: 'Body is required.' };
  }

  try {
    const pool = await getMySQLPool();
    const [result] = await pool.execute(
      `UPDATE docs_sections
       SET role = ?, title = ?, body = ?, sort_order = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [role, title.trim(), body.trim(), sortOrder, id]
    );
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return { error: 'Section not found.' };
    }
    return { success: 'Documentation section updated.' };
  } catch {
    return { error: 'Failed to update section. Please try again.' };
  }
}

export async function deleteDocSectionAction(
  _prevState: DocActionState,
  formData: FormData
): Promise<DocActionState> {
  await requireAdmin();

  const id = Number.parseInt((formData.get('id') as string) || '0', 10);
  if (!id) {
    return { error: 'Invalid section.' };
  }

  try {
    const pool = await getMySQLPool();
    const [result] = await pool.execute(
      'DELETE FROM docs_sections WHERE id = ?',
      [id]
    );
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return { error: 'Section not found.' };
    }
    return { success: 'Documentation section deleted.' };
  } catch {
    return { error: 'Failed to delete section. Please try again.' };
  }
}
