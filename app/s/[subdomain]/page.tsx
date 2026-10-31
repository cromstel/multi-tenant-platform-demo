import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSubdomainData } from '@/lib/subdomains';
import { protocol, rootDomain } from '@/lib/utils';
import { pageMetadata, structuredData } from '@/lib/seo';

export async function generateMetadata({
  params
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    return {
      // No site-name suffix here — the root layout's `title.template`
      // appends it, and baking it in as well doubles it.
      title: 'Subdomain Not Found',
      robots: { index: false, follow: false },
    };
  }

  return pageMetadata({
    title: subdomain,
    description: `${subdomain} is a tenant workspace on CITGROUP TENANCY SYSTEM. Sign in to manage members, settings and integrations.`,
    path: `/${subdomain}`,
    keywords: [subdomain, 'tenant workspace', 'CITGROUP tenancy'],
  });
}

export default async function SubdomainPage({
  params
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  // Structured data describing the tenant as an organisation of its own,
  // parented by the platform.
  const jsonLd = structuredData({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${rootDomain}/${subdomain}#organization`,
    name: subdomain,
    url: `${protocol}://${subdomain}.${rootDomain}`,
    logo: { '@type': 'ImageObject', url: '/icon.svg' },
    parentOrganization: { '@id': `${rootDomain}#organization` },
  });

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white p-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <header className="fixed top-4 right-4 z-10">
        <Link
          href={`http://${rootDomain}`}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors bg-white/80 backdrop-blur-sm rounded-none shadow-sm border border-gray-200"
        >
          CITGROUP TENANCY SYSTEM
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-3xl text-center">
          <div className="text-9xl mb-6">{subdomainData.emoji}</div>
          
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500" aria-hidden="true"></span>
              Active
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-3">
            Welcome to <span className="text-blue-600">{subdomain}</span>
          </h1>
          
          <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
            This is your custom subdomain page on CITGROUP TENANCY SYSTEM. 
            Your tenant is configured and ready to use.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-xl mx-auto mb-8">
            <div className="bg-white rounded-none p-5 border border-gray-200 shadow-sm">
              <div className="text-3xl mb-2">📅</div>
              <div className="text-sm text-gray-500">Created</div>
              <div className="font-medium text-gray-900">
                {new Date(subdomainData.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
            
            <div className="bg-white rounded-none p-5 border border-gray-200 shadow-sm">
              <div className="text-3xl mb-2">🔗</div>
              <div className="text-sm text-gray-500">Subdomain</div>
              <div className="font-medium text-gray-900 text-sm">
                {subdomain}.{rootDomain}
              </div>
            </div>
            
            <div className="bg-white rounded-none p-5 border border-gray-200 shadow-sm">
              <div className="text-3xl mb-2">✨</div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-medium text-green-700">Active</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/login"
              className="px-6 py-3 rounded-none bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              Tenant Sign In
            </Link>
            <Link
              href="http://{subdomain}.{rootDomain}/auth/login"
              className="px-6 py-3 rounded-none bg-white text-gray-700 font-medium hover:bg-gray-50 border border-gray-300 transition-colors"
            >
              Admin Access
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-gray-200">
        <p className="text-center text-sm text-gray-500">
          Powered by CITGROUP TENANCY SYSTEM
        </p>
      </footer>
    </div>
  );
}