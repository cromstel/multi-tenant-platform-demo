'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname?.startsWith('/auth') || pathname?.startsWith('/admin')) return null;

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-6 left-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#005cb3] text-white shadow-xl transition-all hover:bg-[#004A94] hover:scale-105 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
