import type { ReactNode } from 'react';

/**
 * Shared hero banner.
 *
 * Every marketing page that opens with a banner renders it through this
 * component, so the surface colour, the brand glows and the grid overlay are
 * identical on every route. Pages own only the content inside the banner —
 * the section, its decoration and its spacing live here so the banner cannot
 * drift apart from one page to the next.
 *
 * The surface is the deep navy `#0c2238`. Text on it must be light: white for
 * headings, `blue-100`/`blue-200` for supporting copy. Brand ink `#005cb3`
 * fails on this surface and belongs on light backgrounds only.
 */
export function HeroBanner({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-[#0c2238] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-40 left-1/4 h-[560px] w-[560px] rounded-full bg-[#0078E2]/25 blur-[100px]" />
        <div className="absolute -right-32 top-40 h-[420px] w-[420px] rounded-full bg-[#0078E2]/15 blur-[90px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>

      <div className="relative w-full px-4 py-20 sm:px-6 sm:py-28 lg:px-8 xl:px-12">
        {children}
      </div>
    </section>
  );
}
