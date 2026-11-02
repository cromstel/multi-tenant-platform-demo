'use server';
import { redirect } from 'next/navigation';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

import { hashPassword, verifyPassword } from '@/lib/password';
import { getMySQLPool } from '@/lib/db/mysql';

const TOKEN_BYTES = 32;

export async function resetRequestAction(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  if (!email) {
    return { error: 'Email is required' };
  }

  const token = randomBytes(TOKEN_BYTES).toString('hex');
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24; // 24 hours

  try {
    const pool = await getMySQLPool();
    // Find user by email
    const [rows] = await pool.execute(
      'SELECT id FROM tenant_users WHERE email = ?',
      [email]
    );
    const users = rows as Array<{ id: number }>;
    if (users.length === 0) {
      // Do not reveal whether email exists; still return generic message
      return { success: true, message: 'If this email exists, a reset token has been generated.' };
    }
    const userId = users[0].id;

    // Insert token
    await pool.execute(
      'INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [token, userId, expiresAt]
    );
  } catch (e) {
    return { error: 'Failed to create reset token' };
  }

  return { success: true, message: 'A reset token has been generated.' };
}

export async function verifyResetTokenAction(token: string | FormData) {
  const tokenStr = typeof token === 'string' ? token : (token.get('token') as string) || '';
  if (!tokenStr) {
    return { success: false, error: 'Token is required' };
  }

  const pool = await getMySQLPool();
  const [rows] = await pool.execute(
    'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?',
    [tokenStr]
  );
  const results = rows as Array<{ user_id: number; expires_at: number } | undefined>;
  if (!results || results.length === 0) {
    return { success: false, error: 'Invalid or expired token' };
  }

  const entry = results[0];
  const now = Date.now();
  if (entry.expires_at < now) {
    // Clean up expired token
    await pool.execute('DELETE FROM password_reset_tokens WHERE token = ?', [tokenStr]);
    return { success: false, error: 'Token has expired. Please request a new reset link.' };
  }

  const formData = typeof token === 'object' ? token : null;
  const newPassword = formData ? (formData.get('new-password') as string) : null;
  if (newPassword) {
    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }
    const hash = await hashPassword(newPassword);
    await pool.execute('UPDATE tenant_users SET password_hash = ? WHERE id = ?', [hash, entry.user_id]);
    await pool.execute('DELETE FROM password_reset_tokens WHERE token = ?', [tokenStr]);
    return { success: true, message: 'Password updated successfully. Please sign in.' };
  }

  return { success: true, user: entry.user_id };
}
