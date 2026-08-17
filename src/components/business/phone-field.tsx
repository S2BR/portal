"use client";

import { AsYouType, type CountryCode } from "libphonenumber-js";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type ChangeEvent } from "react";

import {
  countryOptions,
  nationalPhone,
  toE164,
} from "@/components/business/phone-format";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A phone entry: a searchable country picker + a number field that formats as you type. The country
 * is stored explicitly (a +1 number can be Canadian or American), the number is stored canonically
 * as E.164, and both are handed up via `onChange`. When the number is still incomplete we keep the
 * raw text in `value` so nothing is lost mid-typing.
 */
export function PhoneField({
  value,
  country,
  defaultCountry,
  invalid,
  onChange,
}: {
  value: string;
  country?: string;
  /** Falls back to the business's address country so a fresh phone starts in the right place. */
  defaultCountry?: string;
  /** Flags the country picker (a number was entered without one) — it must be chosen to save. */
  invalid?: boolean;
  onChange: (value: string, country?: string) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("businesses.detail.phone");
  const options = useMemo(() => countryOptions(locale), [locale]);
  const activeCountry = country ?? defaultCountry;

  // What's shown in the box (national format). Seeded from the stored E.164; thereafter driven by
  // the user's keystrokes via AsYouType.
  const [text, setText] = useState(() =>
    value ? nationalPhone(value, activeCountry) : "",
  );

  const emit = (typed: string, nextCountry?: string) => {
    onChange(toE164(typed, nextCountry) ?? typed.trim(), nextCountry);
  };

  const handleNumber = (event: ChangeEvent<HTMLInputElement>) => {
    const typed = event.target.value;
    setText(
      activeCountry
        ? new AsYouType(activeCountry as CountryCode).input(typed)
        : typed,
    );
    emit(typed, activeCountry);
  };

  const handleCountry = (nextCountry: string) => {
    // Reformat the current number under the newly picked country and re-canonicalize it.
    setText(new AsYouType(nextCountry as CountryCode).input(text));
    emit(text, nextCountry);
  };

  return (
    <div className="flex flex-1 flex-col gap-2 sm:flex-row">
      <Combobox
        options={options}
        value={activeCountry ?? ""}
        onChange={handleCountry}
        placeholder={t("country")}
        searchPlaceholder={t("countrySearch")}
        emptyText={t("countryEmpty")}
        className={cn(
          "sm:w-44",
          invalid && "border-destructive ring-destructive/25 ring-2",
        )}
      />
      <Input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={text}
        onChange={handleNumber}
        placeholder={t("number")}
        className="flex-1"
      />
    </div>
  );
}
