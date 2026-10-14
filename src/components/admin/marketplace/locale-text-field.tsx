"use client";

import { useState } from "react";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_LOCALE,
  LOCALES,
  type LocaleMap,
} from "@/lib/marketplace/admin";
import { cn } from "@/lib/utils";

/**
 * A translatable text input: one value per locale, switched with a compact locale bar. The default
 * locale (English) is required; the rest are optional and marked when they have a value. The full
 * locale map is held by the parent — the API stores every language, so this is how admins translate.
 */
export function LocaleTextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  autoFocus,
}: {
  label: string;
  value: LocaleMap;
  onChange: (next: LocaleMap) => void;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  autoFocus?: boolean;
}) {
  const [active, setActive] = useState(DEFAULT_LOCALE);

  return (
    <Field label={label} hint={hint} error={error}>
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1">
          {LOCALES.map((locale) => {
            const filled = (value[locale.key] ?? "").trim() !== "";
            const isActive = active === locale.key;
            return (
              <button
                key={locale.key}
                type="button"
                onClick={() => setActive(locale.key)}
                className={cn(
                  "focus-visible:ring-ring rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors outline-none focus-visible:ring-2",
                  isActive
                    ? "bg-foreground text-background"
                    : filled
                      ? "bg-muted text-foreground hover:bg-muted/70"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
                )}
                aria-pressed={isActive}
              >
                {locale.label}
                {locale.key === DEFAULT_LOCALE ? " *" : ""}
              </button>
            );
          })}
        </div>
        <Input
          value={value[active] ?? ""}
          placeholder={active === DEFAULT_LOCALE ? placeholder : undefined}
          autoFocus={autoFocus && active === DEFAULT_LOCALE}
          dir={active === "ar" ? "rtl" : undefined}
          onChange={(event) =>
            onChange({ ...value, [active]: event.target.value })
          }
        />
      </div>
    </Field>
  );
}
