import { headers } from 'next/headers';
import { redis } from '@/lib/redis';

const DEFAULTS = {
  whatsapp: 'https://wa.me/1234567890',
  email: 'mailto:hello@example.com',
  linkedin: 'https://linkedin.com/company/example',
  facebook: 'https://facebook.com/example',
};

export default async function FloatingBar() {
  const h = await headers();
  let pathname = h.get('x-invoke-path') || h.get('next-url') || '';
  if (pathname.includes('://')) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      // leave as-is
    }
  }
  const p = pathname.split('?')[0];
  if (p.startsWith('/auth') || p.startsWith('/admin')) return null;

  const links = (await redis.get<Record<string, string>>('social_links')) || {};
  const wa = links.whatsapp || DEFAULTS.whatsapp;
  const em = links.email || DEFAULTS.email;
  const li = links.linkedin || DEFAULTS.linkedin;
  const fb = links.facebook || DEFAULTS.facebook;

  return (
    <aside
      aria-label="Social links"
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3"
    >
      <a
        href={wa}
        aria-label="WhatsApp"
        target="_blank"
        rel="noopener noreferrer"
        className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        title="WhatsApp"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
      </a>
      <a
        href={em}
        aria-label="Email"
        className="w-10 h-10 rounded-full bg-[#005cb3] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        title="Email"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
      </a>
      <a
        href={li}
        aria-label="LinkedIn"
        target="_blank"
        rel="noopener noreferrer"
        className="w-10 h-10 rounded-full bg-[#005cb3] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        title="LinkedIn"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>
      </a>
      <a
        href={fb}
        aria-label="Facebook"
        target="_blank"
        rel="noopener noreferrer"
        className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        title="Facebook"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
      </a>
    </aside>
  );
}
