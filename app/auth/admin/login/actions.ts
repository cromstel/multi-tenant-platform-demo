"use server";

import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';

import { getMySQLPool } from '@/lib/db/mysql';
import { hashPassword, safeEqual, verifyPassword } from '@/lib/password';
import { LOGIN_LIMIT, check, consume, reset } from '@/lib/rate-limit';
import { adminUrl } from '@/lib/admin-path';

export type LoginState = {
  error?: string;
};

const SESSION_COOKIE = "admin_session";
const SESSION_TTL = 8 * 60 * 60;

async function getSessionSecret(): Promise<Uint8Array> {
  try {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error("ADMIN_SESSION_SECRET must be set (32+ chars)");
    }
    return new TextEncoder().encode(secret);
  } catch (error) {
    console.error("[auth] Failed to get session secret:", error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}

/**
 * Creates the administrator account from the environment on first use.
 *
 * The env file is the source of truth for the site administrator, so a fresh
 * checkout should not need a manual SQL insert. The account is only created
 * when the submitted email matches `ADMIN_EMAIL` and the submitted password
 * matches `ADMIN_PASSWORD` — a wrong guess cannot seed a backdoor account.
 */
async function ensureAdminUser(email: string, password: string): Promise<boolean> {
  try {
    const configuredEmail = process.env.ADMIN_EMAIL;
    const configuredPassword = process.env.ADMIN_PASSWORD;

    if (!configuredEmail || !configuredPassword) return false;
    if (email.toLowerCase() !== configuredEmail.toLowerCase()) return false;
    if (!safeEqual(password, configuredPassword)) return false;

    const pool = await getMySQLPool();
    const passwordHash = await hashPassword(password);

    // `INSERT ... ON DUPLICATE KEY` keeps this idempotent — a second sign-in
    // from another tab must not fail on the unique email index.
    await pool.execute(
      `INSERT INTO admin_users (email, password_hash, role)
       VALUES (?, ?, 'super_admin')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = TRUE`,
      [email.toLowerCase(), passwordHash]
    );

    return true;
  } catch (error) {
    console.error("[auth] Failed to ensure admin user:", error instanceof Error ? error.message : "Unknown error");
    return false;
  }
}

async function verifyAdminPassword(
  email: string,
  password: string
): Promise<{ id: number; email: string } | null> {
  try {
    const pool = await getMySQLPool();
    const [rows] = await pool.execute(
      "SELECT id, email, password_hash FROM admin_users WHERE email = ? AND is_active = TRUE LIMIT 1",
      [email]
    );

    const user = (rows as Array<{
      id: number;
      email: string;
      password_hash: string;
    }>)[0];

    if (!user) return null;

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) return null;

    return { id: user.id, email: user.email };
  } catch (error) {
    console.error("[auth] Failed to verify admin password:", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}

function minutesLabel(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes + " minute" + (minutes === 1 ? "" : "s");
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { error: "Email and password are required" };
    }

    const before = await check("admin_login", LOGIN_LIMIT);
    if (!before.allowed) {
      return { error: "Too many failed attempts. Try again in about " + minutesLabel(before.retryAfterSeconds) + "." };
    }

    const user =
      (await verifyAdminPassword(email, password)) ??
      ((await ensureAdminUser(email, password))
        ? await verifyAdminPassword(email, password)
        : null);
    const verdict = await consume("admin_login", LOGIN_LIMIT);

    if (!user) {
      return {
        error: verdict.allowed
          ? "Invalid credentials. " + verdict.attemptsLeft + " attempt" + (verdict.attemptsLeft === 1 ? "" : "s") + " remaining before lockout."
          : "Too many failed attempts. Locked for " + minutesLabel(verdict.retryAfterSeconds) + "."
      };
    }

    if (!verdict.allowed) {
      return { error: "Too many failed attempts. Try again in about " + minutesLabel(verdict.retryAfterSeconds) + "." };
    }

    await reset("admin_login");

    const token = await new SignJWT({ userId: user.id, email: user.email })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("multi-tenant-admin")
      .setExpirationTime(SESSION_TTL + "s")
      .setJti(randomUUID())
      .sign(await getSessionSecret());

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL
    });

    // `adminUrl()` and not a literal `/auth/admin`: while `ADMIN_PATH` is set
    // the internal path answers with a 404, so a redirect to it would strand
    // the operator on "Not Found" right after a successful sign-in.
    redirect(adminUrl());
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("[auth] Admin login failed:", error instanceof Error ? error.message : "Unknown error");
    return { error: "An unexpected error occurred during sign in. Please try again." };
  }
}

function isRedirectError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'digest' in error && typeof (error as { digest?: unknown }).digest === 'string' && (error as { digest: string }).digest.startsWith('NEXT_REDIRECT');
}

export async function logoutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    redirect(adminUrl('/login'));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("[auth] Admin logout failed:", error instanceof Error ? error.message : "Unknown error");
    redirect(adminUrl('/login'));
  }
}

export async function getAdminSession(): Promise<{ userId: number; email: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, await getSessionSecret(), { issuer: "multi-tenant-admin" });
      return { userId: payload.userId as number, email: payload.email as string };
    } catch {
      return null;
    }
  } catch (error) {
    console.error("[auth] Failed to get admin session:", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}

export async function requireAdminSession(): Promise<{ userId: number; email: string }> {
  try {
    const session = await getAdminSession();
    if (!session) redirect(adminUrl('/login'));
    return session;
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("[auth] Failed to require admin session:", error instanceof Error ? error.message : "Unknown error");
    redirect(adminUrl('/login'));
  }
}
