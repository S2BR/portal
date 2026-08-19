"use client";

import { PreviewCard } from "@/components/ui/preview-card";
import { localeNames, locales, type Locale } from "@/i18n/config";

/** A round flag for a locale, from /public/images/flags/<locale>.png. Decorative — the card's label
 * carries the native name. A plain <img> paints the cached flag instantly. */
function LanguageMock({ locale }: { locale: Locale }) {
  return (
    <div className="flex h-14 items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/flags/${locale}.png`}
        alt=""
        width={44}
        height={44}
        className="size-11 rounded-full object-cover"
      />
    </div>
  );
}

/**
 * The language picker as a row of flag preview cards — the same control used in the layout settings.
 * Controlled: `value` is the selected locale, `onSelect` fires on a card click.
 */
export function LanguageCards({
  value,
  onSelect,
}: {
  value: Locale;
  onSelect: (locale: Locale) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {locales.map((option) => (
        <PreviewCard
          key={option}
          selected={option === value}
          onClick={() => onSelect(option)}
          framed={false}
          // Drop the parenthetical region (e.g. "Français (Canada)" → "Français")
          // so the labels stay short under the flag — the flag already conveys the region.
          label={localeNames[option].replace(/\s*\(.+\)$/, "")}
        >
          <LanguageMock locale={option} />
        </PreviewCard>
      ))}
    </div>
  );
}
