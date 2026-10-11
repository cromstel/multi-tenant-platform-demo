import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession, isAdminConfigured } from '@/lib/auth';
import { rootDomain } from '@/lib/utils';
import { LoginForm } from './login-form';

export const metadata = {
  title: `Sign in | ${rootDomain}`,
  description: 'Admin authentication'
};

export default async function AdminLoginPage() {
  // Already signed in? Skip the form.
  if (await getSession()) {
    redirect('/admin');
  }

  const configured = isAdminConfigured();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Admin sign in
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            This area manages tenants for {rootDomain}.
          </p>
        </div>

        {configured ? (
          <LoginForm />
        ) : (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Admin access is not configured.</p>
            <p className="mt-2">
              Set <code className="font-mono">ADMIN_PASSWORD</code> and{' '}
              <code className="font-mono">ADMIN_SESSION_SECRET</code> in
              <code className="font-mono"> .env.local</code>, then restart the
              server. See <code className="font-mono">.env.example</code>.
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm">
          <Link
            href="/"
            className="text-gray-600 underline transition-colors hover:text-gray-900"
          >
            Back to {rootDomain}
          </Link>
        </p>
      </div>
    </div>
  );
}