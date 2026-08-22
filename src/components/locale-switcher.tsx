"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { LanguageCards } from "@/components/auth/language-cards";
import { LocaleFlag } from "@/components/locale-flag";
import { BlurScrim } from "@/components/ui/blur-scrim";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { setLocale } from "@/i18n/actions";
import { isLocale, localeNames, locales, type Locale } from "@/i18n/config";

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
      <BlurScrim open={open} onClose={() => setOpen(false)} />
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
