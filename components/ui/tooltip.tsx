'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Tooltip primitives.
 *
 * Built on Radix so the behaviour is correct without hand-rolling it:
 * opens on hover *and* on keyboard focus, closes on Escape, and exposes the
 * content through `aria-describedby` so a screen reader announces it when
 * the trigger receives focus.
 */

function TooltipProvider({
  delayDuration = 200,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root {...props} />;
}

const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 max-w-xs rounded-none bg-slate-900 px-3 py-2 text-xs leading-relaxed text-white shadow-xl',
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-slate-900" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

/**
 * A help affordance for a form field.
 *
 * Renders an info button that reveals `content` on hover or focus. The
 * trigger is a real `<button>`, so it is reachable by keyboard and
 * announced as a button — a bare `<span title>` is not.
 *
 * **Why the hint is also in the DOM.** A tooltip is a *visual* channel: it
 * disappears on blur, and some assistive technology never surfaces it at
 * all. When the hint carries information the user needs to fill the form
 * in correctly, that information must not live only inside a tooltip.
 *
 * So the same text is also rendered into a visually-hidden element with a
 * stable `id`, and the field itself points at it with `aria-describedby`.
 * The tooltip becomes a convenience for sighted mouse users; the
 * description is the guarantee.
 *
 * ```tsx
 * <FieldHint
 *   id="password-hint"
 *   label="Password requirements"
 *   content="At least 8 characters."
 * />
 * <Input aria-describedby="password-hint" … />
 * ```
 */
function FieldHint({
  id,
  content,
  label = 'More information',
  className,
}: {
  /** Stable id for the hidden description. Point the field at it. */
  id?: string;
  /** The hint text. Shown in the tooltip and, when `id` is set, hidden. */
  content: React.ReactNode;
  /** Accessible name of the trigger button. */
  label?: string;
  className?: string;
}) {
  // The tooltip is controlled rather than left to Radix's internal state, so
  // the keyboard path is explicit: focus opens it, blur closes it. Relying
  // on the library's focus handling left the tooltip unopenable in
  // environments that suppress focus events.
  const [open, setOpen] = useState(false);
  const focused = useRef(false);

  return (
    <Tooltip
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setOpen(true);
          return;
        }
        // A pointer leaving the trigger must not close a tooltip that the
        // user has focused — they are still reading it.
        if (focused.current) return;
        setOpen(false);
      }}
    >
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onFocus={() => {
            focused.current = true;
            setOpen(true);
          }}
          onBlur={() => {
            focused.current = false;
            setOpen(false);
          }}
          className={cn(
            // slate-500 rather than slate-400: the icon is the only thing
            // telling the user a hint exists, so it is a meaningful UI
            // indicator and needs 3:1 (WCAG 1.4.11), not just "looks faint".
            'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors',
            'hover:text-[#005cb3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078E2]/40 focus-visible:ring-offset-1',
            className
          )}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M12 16v-4M12 8h.01" />
          </svg>
        </button>
      </TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>

      {/* The permanent, non-visual copy of the hint. */}
      {id && (
        <span id={id} className="sr-only">
          {content}
        </span>
      )}
    </Tooltip>
  );
}

export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  FieldHint,
};

