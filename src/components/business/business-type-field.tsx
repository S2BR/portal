"use client";

import { Building2, User2, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { BusinessType } from "@/app/api/businesses/route";
import { InfoHint } from "@/components/ui/info-hint";
import { cn } from "@/lib/utils";

/**
 * The business-type selector — Company vs Self-employed as a card radio. Shared by the create
 * and edit forms so the two stay identical; labels come from the shared `businessNew.types`
 * messages.
 */
export function BusinessTypeField({
  value,
  onChange,
  label,
  error,
}: {
  value: BusinessType | null;
  onChange: (type: BusinessType) => void;
  label: string;
  error?: string;
}) {
  const t = useTranslations("businessNew");

  const options: {
    value: BusinessType;
    title: string;
    description: string;
    info: string;
    Icon: LucideIcon;
  }[] = [
    {
      value: "company",
      title: t("types.company.title"),
      description: t("types.company.description"),
      info: t("types.company.info"),
      Icon: Building2,
    },
    {
      value: "self_employed",
      title: t("types.selfEmployed.title"),
      description: t("types.selfEmployed.description"),
      info: t("types.selfEmployed.info"),
      Icon: User2,
    },
  ];

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <div key={option.value} className="relative">
              <button
                type="button"
                onClick={() => onChange(option.value)}
                aria-pressed={selected}
                className={cn(
                  // Borderless, three-step gray like the profile popup blocks: default → hover →
                  // selected, with the selection marked by the brand-green dot (below).
                  "focus-visible:ring-ring flex h-full w-full items-start gap-3 rounded-xl p-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset",
                  selected
                    ? "bg-muted-foreground/10"
                    : "bg-muted/40 hover:bg-muted/70",
                )}
              >
                <span className="bg-background text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <option.Icon className="size-5" />
                </span>
                <span className="min-w-0 pe-6">
                  <span className="flex items-center gap-1.5">
                    <span className="font-medium">{option.title}</span>
                    {selected ? (
                      <span
                        className="bg-brand-green size-2 shrink-0 rounded-full"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                  <span className="text-muted-foreground block text-sm">
                    {option.description}
                  </span>
                </span>
              </button>
              <InfoHint
                label={t("moreInfo")}
                text={option.info}
                className="absolute end-2.5 top-2.5"
              />
            </div>
          );
        })}
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </fieldset>
  );
}
