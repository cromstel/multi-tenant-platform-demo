import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

const AUTH_COOKIE = 'AUTH_COOKIE';
const EXCLUDED = [
  '/',
  '/about',
  '/contact',
  '/faq',
  '/services',
  '/s',
  '/api'
];

function isExcluded(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname.startsWith('/auth/')) return true;
  if (pathname.startsWith('/admin/')) return true;
  if (EXCLUDED.includes(pathname) || EXCLUDED.some((p) => pathname.startsWith(p + '/'))) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isExcluded(pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (!cookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const payload = await verifyToken(cookie);
  if (!payload || !payload.sub) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
