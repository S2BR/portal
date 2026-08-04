"use client";

import { CheckIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    <Image
      src={`/images/flags/${locale}.png`}
      alt=""
      width={20}
      height={20}
      unoptimized
      className={cn("size-5 shrink-0 rounded-full object-cover", className)}
    />
  );
}

export function LocaleSwitcher() {
  const locale = useLocale();
  const activeLocale = isLocale(locale) ? locale : locales[0];
  const t = useTranslations("locale");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function selectLocale(next: Locale) {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={t("label")}
          disabled={isPending}
        >
          <LocaleFlag locale={activeLocale} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((option) => (
          <DropdownMenuItem key={option} onClick={() => selectLocale(option)}>
            <LocaleFlag locale={option} />
            <span>{localeNames[option]}</span>
            <CheckIcon
              className={cn(
                "ml-auto size-4",
                option === activeLocale ? "opacity-100" : "opacity-0",
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
