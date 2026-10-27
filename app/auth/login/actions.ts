'use server';

import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getMySQLPool } from '@/lib/db/mysql';
import { verifyPassword } from '@/lib/password';
import { LOGIN_LIMIT, check, consume, reset } from '@/lib/rate-limit';
import { sanitizeSubdomain } from '@/lib/subdomains';
import { protocol, rootDomain } from '@/lib/utils';

export type LoginState = {
  error?: string;
};

const SESSION_COOKIE = 'tenant_session';
const SESSION_TTL = 24 * 60 * 60; // 24 hours

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

function minutesLabel(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

function isRedirectError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'digest' in error && typeof (error as { digest?: unknown }).digest === 'string' && (error as { digest: string }).digest.startsWith('NEXT_REDIRECT');
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    const pool = await getMySQLPool();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const subdomain = formData.get('subdomain') as string;

    if (!email || !password || !subdomain) {
      return { error: 'Subdomain, email, and password are required' };
    }

    // Sanitize subdomain
    const sanitizedSubdomain = sanitizeSubdomain(subdomain);
    if (!sanitizedSubdomain || sanitizedSubdomain !== subdomain) {
      return { error: 'Invalid subdomain' };
    }

    // Get tenant
    const [tenantRows] = (await pool.execute(
      'SELECT id FROM tenants WHERE subdomain = ?',
      [sanitizedSubdomain]
    )) as [Array<{ id: number }>, unknown];

    if (tenantRows.length === 0) {
      return { error: 'Tenant not found' };
    }
    
    const tenantId = tenantRows[0].id;

    // Check rate limit
    const before = await check(`tenant_login:${tenantId}`, LOGIN_LIMIT);
    if (!before.allowed) {
      return {
        error: `Too many failed attempts. Try again in about ${minutesLabel(before.retryAfterSeconds)}.`
      };
    }

    // Verify user credentials
    const [userRows] = (await pool.execute(
      'SELECT id, password_hash FROM tenant_users WHERE tenant_id = ? AND email = ? AND is_active = TRUE LIMIT 1',
      [tenantId, email]
    )) as [Array<{ id: number; password_hash: string }>, unknown];

    const user = userRows[0];
    const verdict = await consume(`tenant_login:${tenantId}`, LOGIN_LIMIT);

    if (!user || !await verifyPassword(password, user.password_hash)) {
      return {
        error: verdict.allowed
          ? `Invalid credentials. ${verdict.attemptsLeft} attempt${verdict.attemptsLeft === 1 ? '' : 's'} remaining before lockout.`
          : `Too many failed attempts. Locked for ${minutesLabel(verdict.retryAfterSeconds)}.`
      };
    }

    if (!verdict.allowed) {
      return {
        error: `Too many failed attempts. Try again in about ${minutesLabel(verdict.retryAfterSeconds)}.`
      };
    }

    await reset(`tenant_login:${tenantId}`);

    // Create session
    const token = await new SignJWT({ 
      userId: user.id, 
      tenantId,
      email 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('multi-tenant-tenant')
      .setExpirationTime(`${SESSION_TTL}s`)
      .setJti(crypto.randomUUID())
      .sign(await getSessionSecret());

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_TTL
    });

    // Redirect to the tenant's dashboard on its own subdomain. Same URL
    // shape as `app/actions.ts` — `protocol`/`rootDomain` come from
    // `lib/utils.ts`, never straight from the env here.
    redirect(`${protocol}://${sanitizedSubdomain}.${rootDomain}/dashboard`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error('[auth] Tenant login failed:', error instanceof Error ? error.message : 'Unknown error');
    return { error: 'An unexpected error occurred during sign in. Please try again.' };
  }
}

export async function logoutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    redirect('/auth/login');
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error('[auth] Tenant logout failed:', error instanceof Error ? error.message : 'Unknown error');
    redirect('/auth/login');
  }
}

export async function getTenantSession(): Promise<{ userId: number; tenantId: number; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    try {
      const { payload } = await jwtVerify(token, await getSessionSecret(), {
        issuer: 'multi-tenant-tenant'
      });
      return { 
        userId: payload.userId as number, 
        tenantId: payload.tenantId as number, 
        email: payload.email as string 
      };
    } catch {
      return null;
    }
  } catch (error) {
    console.error('[auth] Failed to get tenant session:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

export async function requireTenantSession(): Promise<{ userId: number; tenantId: number; email: string }> {
  try {
    const session = await getTenantSession();
    if (!session) redirect('/auth/login');
    return session;
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error('[auth] Failed to require tenant session:', error instanceof Error ? error.message : 'Unknown error');
    redirect('/auth/login');
  }
}