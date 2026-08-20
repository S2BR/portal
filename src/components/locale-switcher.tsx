"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { LanguageCards } from "@/components/auth/language-cards";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { setLocale } from "@/i18n/actions";
import { isLocale, localeNames, locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/** The round flag for a locale, from /public/images/flags/<locale>.png. */
function LocaleFlag({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  return (
    // A plain <img> (not next/image) so the cached flag paints instantly when the header re-mounts
    // on a layout change, with no loading transition.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/images/flags/${locale}.png`}
      alt=""
      width={20}
      height={20}
      className={cn("size-5 shrink-0 rounded-full object-cover", className)}
    />
  );
}

/**
 * The header language switcher: a compact flag button that opens the same greeting-card picker used
 * in Settings, at a two-column density in a narrow popover — so the header and settings share one
 * control and one look. Selecting a language persists it and refreshes the tree.
 */
export function LocaleSwitcher({
  variant = "ghost",
}: {
  variant?: "outline" | "ghost";
} = {}) {
  const locale = useLocale();
  const activeLocale = isLocale(locale) ? locale : locales[0];
  const t = useTranslations("locale");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function selectLocale(next: Locale) {
    setOpen(false);
    if (next === activeLocale) {
      return;
    }
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <>
      {/* A soft blur scrim behind the open picker — the same effect as the category "Can't find
          your category?" feedback popover. Portaled to <body> so `fixed` covers the whole viewport
          (rendered in the header, an ancestor's containing block would clip it to the header strip),
          at z-[9] — just under the header's z-10 — so the page blurs while the header (and its
          language button) stay crisp on top. The popover content (z-50) sits above it. */}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-hidden
              onPointerDown={() => setOpen(false)}
              className="animate-in fade-in-0 fixed inset-0 z-[9] bg-black/10 backdrop-blur-[3px]"
            />,
            document.body,
          )
        : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={variant}
            aria-label={t("label")}
            disabled={isPending}
            className="gap-2"
          >
            <LocaleFlag locale={activeLocale} />
            {/* The current language's own name — region dropped so the trigger stays compact. */}
            <span className="text-sm font-medium">
              {localeNames[activeLocale].replace(/\s*\(.+\)$/, "")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[34rem] max-w-[calc(100vw-2rem)] p-4"
        >
          <LanguageCards
            value={activeLocale}
            onSelect={selectLocale}
            className="grid-cols-4 sm:grid-cols-4"
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
