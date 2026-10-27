'use server';

import { redirect } from 'next/navigation';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

import { getMySQLPool } from '@/lib/db/mysql';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '@/lib/password';
import { CREATE_LIMIT, consume } from '@/lib/rate-limit';
import { sanitizeSubdomain } from '@/lib/subdomains';
import { protocol, rootDomain } from '@/lib/utils';

export type RegisterState = {
  error?: string;
  success?: boolean;
  subdomain?: string;
  email?: string;
  icon?: string;
};

const SESSION_COOKIE = 'tenant_session';
const SESSION_TTL = 24 * 60 * 60; // 24 hours

function isRedirectError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'digest' in error && typeof (error as { digest?: unknown }).digest === 'string' && (error as { digest: string }).digest.startsWith('NEXT_REDIRECT');
}

async function getSessionSecret(): Promise<Uint8Array> {
  try {
    const secret = process.env.TENANT_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('TENANT_SESSION_SECRET or ADMIN_SESSION_SECRET must be set (32+ chars)');
    }
    return new TextEncoder().encode(secret);
  } catch (error) {
    console.error('[auth] Failed to get tenant session secret:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  try {
    return await performRegistration(_prevState, formData);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error('[auth] Tenant registration failed:', error instanceof Error ? error.message : 'Unknown error');
    return { error: 'An unexpected error occurred during registration. Please try again.' };
  }
}

async function performRegistration(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const subdomain = formData.get('subdomain') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const emoji = formData.get('icon') as string;

  if (!subdomain || !email || !password || !confirmPassword || !emoji) {
    return { error: 'All fields are required' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  // Rate limit every attempt, not just the successful ones — otherwise an
  // attacker can enumerate subdomains without ever consuming budget.
  const limit = await consume('create', CREATE_LIMIT);
  if (!limit.allowed) {
    return {
      error: `Too many tenants created. Try again in about ${Math.max(1, Math.ceil(limit.retryAfterSeconds / 60))} minutes.`
    };
  }

  // Sanitise the subdomain. A value that changes under sanitisation is
  // rejected rather than silently accepted, so the user sees what they typed.
  const sanitizedSubdomain = sanitizeSubdomain(subdomain);

  if (!sanitizedSubdomain || sanitizedSubdomain.length > 63) {
    return {
      error:
        'Invalid subdomain. Use lowercase letters, numbers, and hyphens (max 63 chars).'
    };
  }

  if (sanitizedSubdomain !== subdomain) {
    return {
      error: 'Subdomain can only contain lowercase letters, numbers, and hyphens.'
    };
  }

  const pool = await getMySQLPool();

  // Check for a duplicate subdomain
  const [existing] = await pool.execute(
    'SELECT id FROM tenants WHERE subdomain = ?',
    [sanitizedSubdomain]
  );
  if ((existing as Array<{ id: number }>).length > 0) {
    return { error: 'This subdomain is already taken' };
  }

  // The unique index on `tenants.subdomain` is the real guard against a race
  // between two simultaneous signups.
  const passwordHash = await hashPassword(password);

  // Create tenant and owner user in one transaction — a tenant without an
  // owner would be unreachable and unmanageable.
  const conn = await pool.getConnection();
  let tenantId: number;
  let userId: number;

  try {
    await conn.beginTransaction();

    const [tenantResult] = await conn.execute(
      'INSERT INTO tenants (subdomain, emoji) VALUES (?, ?)',
      [sanitizedSubdomain, emoji]
    );
    tenantId = (tenantResult as { insertId: number }).insertId;

    const [userResult] = await conn.execute(
      'INSERT INTO tenant_users (tenant_id, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [tenantId, email, passwordHash, 'owner']
    );
    userId = (userResult as { insertId: number }).insertId;

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    // A duplicate-key error means someone registered the same subdomain
    // between the SELECT above and this INSERT.
    const code = (error as { code?: string }).code;
    if (code === 'ER_DUP_ENTRY') {
      return { error: 'This subdomain is already taken' };
    }
    throw error;
  } finally {
    conn.release();
  }

  // Create the session
  const token = await new SignJWT({ userId, tenantId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('multi-tenant-tenant')
    .setExpirationTime(`${SESSION_TTL}s`)
    .setJti(randomUUID())
    .sign(await getSessionSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL
  });

  redirect(`${protocol}://${sanitizedSubdomain}.${rootDomain}/dashboard`);
}
