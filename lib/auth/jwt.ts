import { SignJWT, jwtVerify } from 'jose';

export const VERIFY_SECRET = process.env.AUTH_JWT_SECRET;

export interface JwtPayload {
  sub?: string;
  role?: 'owner' | 'admin' | 'member' | 'super_admin';
  tenantId?: number;
  [k: string]: unknown;
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  if (VERIFY_SECRET === undefined) {
    return null;
  }
  try {
    const encoder = new TextEncoder();
    const secret = encoder.encode(VERIFY_SECRET);
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

export async function issueSession(payload: { sub?: string; role?: 'owner' | 'admin' | 'member' | 'super_admin'; tenantId?: number }): Promise<string> {
  if (VERIFY_SECRET === undefined) {
    throw new Error('AUTH_JWT_SECRET is not set — refusing to issue a session');
  }
  const encoder = new TextEncoder();
  const secret = encoder.encode(VERIFY_SECRET);
  const token = await new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(secret);
  return token;
}
