'use client';

import { useId, useState } from 'react';
import { Smile } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from '@/components/ui/emoji-picker';
import { FieldHint, TooltipProvider } from '@/components/ui/tooltip';

/**
 * The brand mark picker.
 *
 * A searchable emoji picker rather than a free-text field: the value has to
 * be a real emoji, and asking someone to type one is a worse experience
 * than letting them pick one.
 *
 * The chosen emoji is mirrored onto a hidden input so it reaches the server
 * action, and the trigger shows the current selection so the user always
 * knows what they picked.
 */
export function EmojiField({
  name = 'icon',
  label = 'Brand mark',
  hint,
  value,
  onChange,
  required = true,
}: {
  name?: string;
  label?: string;
  /** Tooltip text shown next to the label. */
  hint?: string;
  value: string;
  onChange: (emoji: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // The trigger is a button, not an input, so a `<label for>` would have
  // nothing to point at. The visible text is referenced by `aria-labelledby`
  // instead.
  //
  // WCAG 2.5.3 "Label in Name" requires the accessible name to *contain* the
  // visible text of the control. `nameId` points at a wrapper around every
  // visible word inside the button, so the name is derived from the very
  // same text the user sees — there is no way for the two to drift apart.
  const labelId = useId();
  const nameId = useId();

  // The trailing space is not cosmetic. The button renders "<status> <action>"
  // as two elements, and the text of two adjacent inline elements is
  // concatenated without a separator — so without it the accessible name
  // would read "SelectedChange" and stop matching what is on screen.
  const statusText = value
    ? 'Selected '
    : `Pick an emoji for your ${label.toLowerCase()} `;

  return (
    <TooltipProvider>
      <div>
        <div className="mb-1.5 flex items-center gap-1.5">
          <span
            id={labelId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </span>
          {hint && <FieldHint label={`About ${label.toLowerCase()}`} content={hint} />}
        </div>

        <input type="hidden" name={name} value={value} required={required} />

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-labelledby={`${labelId} ${nameId}`}
              className="flex h-12 w-full items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-left transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078E2]/40"
            >
              <span id={nameId} className="flex w-full items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xl shadow-sm ring-1 ring-slate-200"
                    aria-hidden="true"
                  >
                    {value || <Smile className="h-4 w-4 text-slate-500" />}
                  </span>
                  <span
                    className={`text-sm ${value ? 'text-slate-700' : 'text-slate-500'}`}
                  >
                    {statusText}
                  </span>
                </span>
                {/* A darker shade of the brand blue: the brand hex only
                    reaches 4.4:1 as small text on a light background. */}
                <span className="text-xs font-semibold text-[#005cb3]">
                  Change
                </span>
              </span>
            </button>
          </PopoverTrigger>

          <PopoverContent className="w-[256px] p-0" align="start" sideOffset={5}>
            <EmojiPicker
              className="h-[300px] w-[256px]"
              onEmojiSelect={({ emoji }) => {
                onChange(emoji);
                setOpen(false);
              }}
            >
              <EmojiPickerSearch />
              <EmojiPickerContent />
              <EmojiPickerFooter />
            </EmojiPicker>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}
