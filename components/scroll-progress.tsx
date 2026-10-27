'use client';

import { useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * Scroll progress bar + back-to-top control.
 *
 * The bar width is written straight to the element's style rather than going
 * through React state. A scroll handler fires on every frame of a flick-scroll;
 * re-rendering the tree that often is wasteful, and the visual result is
 * identical. `aria-valuenow` is kept in sync for assistive technology.
 */
export function ScrollProgress() {
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;

      const doc = document.scrollingElement ?? document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;

      // A document that cannot scroll reports a ratio of 1 (nothing left to
      // reveal) rather than dividing by zero.
      const ratio = scrollable > 0 ? doc.scrollTop / scrollable : 1;
      const clamped = Math.min(1, Math.max(0, ratio));

      const bar = barRef.current;
      if (bar) {
        bar.style.transform = `scaleX(${clamped})`;
      }

      // `aria-valuenow` belongs on the element that carries `role="progressbar"`.
      // Writing it to the inner bar — which has no role — is an
      // `aria-allowed-attr` violation, so the track is the one that reports
      // the value.
      const track = trackRef.current;
      if (track) {
        track.setAttribute('aria-valuenow', String(Math.round(clamped * 100)));
      }

      const button = buttonRef.current;
      if (button) {
        const show = doc.scrollTop > 240;
        button.classList.toggle('opacity-100', show);
        button.classList.toggle('translate-y-0', show);
        button.classList.toggle('opacity-0', !show);
        button.classList.toggle('translate-y-3', !show);
        button.classList.toggle('pointer-events-none', !show);
      }
    };

    const onScroll = () => {
      // Coalesce bursts of scroll events into a single animation frame.
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const scrollToTop = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <>
      {/* Progress bar — sits directly under the sticky header */}
      <div
        ref={trackRef}
        className="pointer-events-none fixed inset-x-0 top-16 z-40 h-[3px]"
        role="progressbar"
        aria-label="Page scroll progress"
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          ref={barRef}
          className="h-full w-full origin-left scale-x-0 bg-gradient-to-r from-[#0078E2] to-[#5B9CF5] shadow-[0_0_10px_rgba(0,120,226,0.55)] will-change-transform"
        />
      </div>

      {/* Back to top */}
      <button
        ref={buttonRef}
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll back to top"
        className="pointer-events-none fixed bottom-6 right-6 z-40 flex h-11 w-11 translate-y-3 items-center justify-center rounded-full bg-[#005cb3] text-white opacity-0 shadow-xl shadow-blue-600/35 transition-all duration-300 hover:bg-[#004A94] hover:shadow-2xl active:scale-95"
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </button>
    </>
  );
}
