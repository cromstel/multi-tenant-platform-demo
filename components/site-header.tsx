'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, ChevronDown } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
];

const SERVICES_LINKS = [
  { label: 'Provisioning API', href: '/services/provisioning' },
  { label: 'Tenant Management', href: '/services/tenant-management' },
  { label: 'Data Isolation', href: '/services/data-isolation' },
  { label: 'Monitoring & Alerts', href: '/services/monitoring' },
  { label: 'User Management', href: '/services/user-management' },
  { label: 'Automation & Integrations', href: '/services/automation' },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Brand. */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-none bg-gradient-to-br from-[#0078E2] to-[#5B9CF5] shadow-lg shadow-blue-600/25 transition-transform group-hover:scale-105">
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

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-none px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
          <div
            className="relative group"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              type="button"
              className="flex items-center gap-1 rounded-none px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-expanded={servicesOpen}
              aria-haspopup="true"
              onClick={() => setServicesOpen((v) => !v)}
            >
              Services
              <ChevronDown className={`h-4 w-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {servicesOpen && (
              <div className="absolute left-0 top-full w-64 pt-2 mt-1">
                <div className="overflow-hidden rounded-none border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/5">
                  {SERVICES_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded-none px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#005cb3]"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/auth/login"
            className="rounded-none px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-1.5 rounded-none bg-[#005cb3] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#004A94] active:scale-[0.98]"
          >
            Get Started
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="rounded-none p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <nav className="w-full space-y-1 px-4 py-4 sm:px-6 lg:px-8 xl:px-12" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-none px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#005cb3]"
              >
                {link.label}
              </a>
            ))}
            <div className="my-3 h-px bg-slate-200" />
            <div className="my-4 flex flex-col gap-2">
              <Link
                href="/services/provisioning"
                onClick={() => setMobileOpen(false)}
                className="block rounded-none px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#005cb3]"
              >
                Provisioning API
              </Link>
              <Link
                href="/services/tenant-management"
                onClick={() => setMobileOpen(false)}
                className="block rounded-none px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#005cb3]"
              >
                Tenant Management
              </Link>
              <Link
                href="/services/data-isolation"
                onClick={() => setMobileOpen(false)}
                className="block rounded-none px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#005cb3]"
              >
                Data Isolation
              </Link>
              <Link
                href="/services/monitoring"
                onClick={() => setMobileOpen(false)}
                className="block rounded-none px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#005cb3]"
              >
                Monitoring & Alerts
              </Link>
              <Link
                href="/services/user-management"
                onClick={() => setMobileOpen(false)}
                className="block rounded-none px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#005cb3]"
              >
                User Management
              </Link>
              <Link
                href="/services/automation"
                onClick={() => setMobileOpen(false)}
                className="block rounded-none px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#005cb3]"
              >
                Automation & Integrations
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-none border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setMobileOpen(false)}
                className="rounded-none bg-[#005cb3] px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#004A94]"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
