'use server';

import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getMySQLPool } from '@/lib/db/mysql';
import {
  createSession,
  deleteSession,
  isSessionAlive,
  purgeExpiredSessions,
} from '@/lib/db/sessions';
import { verifyPassword } from '@/lib/password';
import { LOGIN_LIMIT, check, consume, reset } from '@/lib/rate-limit';
import { protocol, rootDomain, getTenantSessionSecret, isRedirectError, minutesLabel, validateSubdomain } from '@/lib/utils';
import { issueSession } from '@/lib/auth/jwt';

export type LoginState = {
  error?: string;
};

const SESSION_COOKIE = 'tenant_session';
const AUTH_COOKIE = 'AUTH_COOKIE';
const SESSION_TTL = 24 * 60 * 60; // 24 hours


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

    const validation = validateSubdomain(subdomain);
    if (!validation.ok) {
      return { error: validation.error ?? 'Invalid subdomain' };
    }
    const sanitizedSubdomain = validation.subdomain!;

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
      'SELECT id, password_hash, role FROM tenant_users WHERE tenant_id = ? AND email = ? AND is_active = TRUE LIMIT 1',
      [tenantId, email]
    )) as [Array<{ id: number; password_hash: string; role: string }>, unknown];

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

    await reset(`tenant_login:${tenantId}`, LOGIN_LIMIT);

    // Create session. The JWT's `jti` doubles as the tenant_sessions row id,
    // so the session can be listed and revoked — and a revoked row actually
    // signs the cookie out on its next use.
    const sessionId = crypto.randomUUID();

    const token = await new SignJWT({
      userId: user.id,
      tenantId,
      email,
      role: (user as { role?: string }).role || 'member'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('multi-tenant-tenant')
      .setExpirationTime(`${SESSION_TTL}s`)
      .setJti(sessionId)
      .sign(await getTenantSessionSecret());

    // Drop this user's already-expired rows, then record the new session.
    await purgeExpiredSessions('tenant_sessions', user.id);
    await createSession('tenant_sessions', {
      id: sessionId,
      userId: user.id,
      tenantId,
      expiresAt: Date.now() + SESSION_TTL * 1000,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_TTL
    });

    // Also set AUTH_COOKIE so the auth middleware (app/middleware.ts) can
    // verify this session on protected routes without relying on a separate
    // signing secret. Uses AUTH_JWT_SECRET via lib/auth/jwt.ts.
    const authCookie = await issueSession({
      sub: email,
      role: ((user as { role?: string }).role || 'member') as import('@/lib/auth/jwt').JwtPayload['role'],
      tenantId
    });
    cookieStore.set(AUTH_COOKIE, authCookie, {
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
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) {
      try {
        // Delete this session's row so the sign-out is real: the cookie can
        // never be replayed as an active session afterwards.
        const { payload } = await jwtVerify(token, await getTenantSessionSecret(), { issuer: 'multi-tenant-tenant' });
        if (typeof payload.jti === 'string') {
          await deleteSession('tenant_sessions', payload.jti);
        }
      } catch {
        // An expired or tampered cookie has no row to delete.
      }
    }
    cookieStore.delete(SESSION_COOKIE);
    cookieStore.delete(AUTH_COOKIE);
    redirect('/auth/login');
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error('[auth] Tenant logout failed:', error instanceof Error ? error.message : 'Unknown error');
    redirect('/auth/login');
  }
}

export async function getTenantSession(): Promise<{ userId: number; tenantId: number; email: string; role: string } | null> {
  // `cookies()` deliberately sits outside the `try`. While a route is being
  // prerendered Next.js signals "this page is dynamic" by throwing from it;
  // catching that error would let the build snapshot the page with no session
  // and serve that snapshot to everyone. An expired or tampered token is a
  // different case — that is ours to handle, and it means "signed out".
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, await getTenantSessionSecret(), {
      issuer: 'multi-tenant-tenant'
    });

    // A valid signature alone is not enough: the session row must still exist
    // and be unexpired. Revoking a session deletes its row, which signs the
    // cookie out on its very next use.
    const jti = typeof payload.jti === 'string' ? payload.jti : null;
    if (!jti || !(await isSessionAlive('tenant_sessions', jti))) {
      return null;
    }

    return {
      userId: payload.userId as number,
      tenantId: payload.tenantId as number,
      email: payload.email as string,
      role: (payload.role as string) || 'member'
    };
  } catch {
    return null;
  }
}

export async function requireTenantSession(): Promise<{ userId: number; tenantId: number; email: string; role: string }> {
  const session = await getTenantSession();
  if (!session) redirect('/auth/login');
  return session;
}