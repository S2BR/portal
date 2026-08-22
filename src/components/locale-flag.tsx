import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * The round PNG flag for a locale (`/public/images/flags/<locale>.png`) — the single source of truth
 * for how a flag is rendered across the app (locale switcher, language cards, the taxonomy coverage
 * avatars + editor tabs). A plain `<img>` (not next/image) so a cached flag paints instantly with no
 * loading transition. Size via `className` (defaults to `size-5`); dim/grayscale it through
 * `className` too (e.g. an untranslated locale).
 */
export function LocaleFlag({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/images/flags/${locale}.png`}
      alt=""
      className={cn("size-5 shrink-0 rounded-full object-cover", className)}
    />
  );
}
