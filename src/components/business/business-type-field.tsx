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
                  "focus-visible:ring-ring flex h-full w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-2",
                  selected
                    ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                    : "hover:border-primary/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    selected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <option.Icon className="size-5" />
                </span>
                <span className="min-w-0 pe-6">
                  <span className="block font-medium">{option.title}</span>
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
