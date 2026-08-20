"use client";

import {
  getDirection,
  localeGreetings,
  localeNames,
  locales,
  type Locale,
} from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * One language option, fully centered: a large round flag up top, with the greeting (in the
 * language's own words) and the language's own name stacked and centered near the bottom. `dir` is
 * scoped to the greeting text so Arabic shapes correctly without affecting the centered layout.
 */
function LanguageCard({
  locale,
  selected,
  onSelect,
}: {
  locale: Locale;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "focus-visible:ring-ring relative flex min-h-[7.5rem] flex-col items-center rounded-xl px-2 pt-5 pb-3 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset",
        selected ? "bg-muted-foreground/10" : "bg-muted/40 hover:bg-muted/70",
      )}
    >
      {/* Selection dot, pinned to the top end corner (top-right in LTR, flips with direction). */}
      {selected ? (
        <span
          className="bg-brand-green absolute end-2 top-2 size-2 rounded-full"
          aria-hidden
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/flags/${locale}.png`}
        alt=""
        width={48}
        height={48}
        className="size-12 rounded-full object-cover"
      />
      <span className="mt-auto flex flex-col items-center gap-0.5 pt-3">
        <span
          dir={getDirection(locale)}
          className="text-base leading-tight font-bold tracking-tight"
        >
          {localeGreetings[locale]}
        </span>
        <span className="text-muted-foreground text-[11px] font-semibold">
          {localeNames[locale].replace(/\s*\(.+\)$/, "")}
        </span>
      </span>
    </button>
  );
}

/**
 * The language picker as a grid of centered greeting cards — each greets you in its own language,
 * with a large flag above and the language's own name below. Backs the layout settings, the profile
 * language picker, and the header switcher. Controlled: `value` is the selected locale, `onSelect`
 * fires on a card click. `className` can override the grid density (e.g. the header popover).
 */
export function LanguageCards({
  value,
  onSelect,
  className,
}: {
  value: Locale;
  onSelect: (locale: Locale) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-3 sm:grid-cols-4", className)}>
      {locales.map((option) => (
        <LanguageCard
          key={option}
          locale={option}
          selected={option === value}
          onSelect={() => onSelect(option)}
        />
      ))}
    </div>
  );
}
