import Link from 'next/link';
import { rootDomain } from '@/lib/utils';

const FOOTER_SECTIONS = [
  {
    title: 'Platform',
    links: [
      { label: 'Overview', href: '/#platform' },
      { label: 'Features', href: '/#features' },
      { label: 'Architecture', href: '/#architecture' },
      { label: 'Security', href: '/#security' },
    ],
  },
  {
    title: 'Product',
    links: [
      { label: 'Create Tenant', href: '/auth/register' },
      { label: 'Tenant Sign In', href: '/auth/login' },
      { label: 'Contact & Support', href: '/contact' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/#faq' },
      { label: 'API Reference', href: '/#platform' },
      { label: 'Status', href: '/#platform' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
];

const SOCIALS = [
  {
    label: 'GitHub',
    href: 'https://github.com',
    path: 'M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.21-.01-.72-.01-1.31-.28 1.87-1.13 3.64-2.89 4.32-.23-.2-.44-.55-.64-.99 2.22-.26 4.55-1.13 4.55-5.02 0-1.11-.38-2.02-1.03-2.73.1-.26.45-1.29.1-1.61 0 0 .84-.27 2.75 1.04A9.3 9.3 0 0112 6.9c.85 0 1.71.12 2.51.34 1.91-1.31 2.75-1.04 2.75-1.04.35.32.4 1.35.1 1.61-.65.71-1.03 1.62-1.03 2.73 0 3.9-2.34 4.76-4.57 5.01.21.2.4.58.4 1.16 0 .67-.01 1.22-.01 1.39 0 .27.18.6.69.41A10.02 10.02 0 012 12.25C2 6.58 6.48 2 12 2z',
  },
  {
    label: 'X',
    href: 'https://x.com',
    path: 'M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.96 6.82H1.69l7.73-8.84L1.25 2.25h6.82l4.71 6.23 5.46-6.23zm-1.16 17.52h1.83L7.01 4.13H5.04l12.04 15.64z',
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com',
    path: 'M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zm-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-1.79 0-2.71 1.05-3.11 1.78h-.05V10H9v8.5h2.58v-4.21c0-1.1.21-2.18 1.58-2.18 1.35 0 1.36 1.27 1.36 2.25v4.14H19zM6.88 8.56a1.56 1.56 0 110-3.12 1.56 1.56 0 010 3.12zM8.38 18.5H5.81V10h2.57v8.5z',
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {/* Top: brand + link columns */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0078E2] to-[#5B9CF5] shadow-lg shadow-blue-600/25">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </span>
              <span className="leading-none">
                <span className="block text-[15px] font-extrabold tracking-tight text-slate-900">CITGROUP</span>
                <span className="block text-[10px] font-bold tracking-[0.2em] text-[#005cb3] uppercase">Tenancy System</span>
              </span>
              <span className="sr-only">home</span>
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              Subdomain-based multi-tenant infrastructure for CITGROUP. Deploy once, isolate every
              customer, scale independently.
            </p>

            <div className="mt-5 flex items-center gap-2">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:border-[#0078E2]/40 hover:bg-[#004A94] hover:text-white"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{section.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-600 transition-colors hover:text-[#005cb3]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            © {year} CITGROUP. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              All systems operational
            </span>
            <span className="text-xs text-slate-500">Running on {rootDomain}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
