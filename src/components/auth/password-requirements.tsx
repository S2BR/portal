"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import type { AppConfig } from "@/lib/api/types";
import { passwordRequirements, type PasswordRule } from "@/lib/auth/password";
import { cn } from "@/lib/utils";

/** Maps a policy rule to its `auth.passwordRules` label key. */
const LABEL_KEY: Record<PasswordRule, string> = {
  min: "length",
  mixed_case: "mixedCase",
  numbers: "number",
  symbols: "symbol",
};

/**
 * A live checklist of the password policy's requirements. Each line greens with
 * a checkmark the moment the typed password satisfies it — mirroring the mobile
 * app. Renders nothing when the policy has no active rules.
 */
export function PasswordRequirements({
  password,
  policy,
}: {
  password: string;
  policy: AppConfig["password"];
}) {
  const t = useTranslations("auth.passwordRules");
  const requirements = passwordRequirements(password, policy);

  if (requirements.length === 0) {
    return null;
  }

  return (
    <ul className="mt-1 space-y-1.5" aria-label={t("title")}>
      {requirements.map(({ rule, met }) => (
        <li
          key={rule}
          className={cn(
            "flex items-center gap-2 text-xs transition-colors",
            met
              ? "text-green-600 dark:text-green-500"
              : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
              met
                ? "border-green-600 bg-green-600 text-white dark:border-green-500 dark:bg-green-500"
                : "border-muted-foreground/40",
            )}
          >
            {met ? (
              <Check className="size-2.5" strokeWidth={3} aria-hidden />
            ) : null}
          </span>
          <span>
            {rule === "min"
              ? t("length", { min: policy.min })
              : t(LABEL_KEY[rule])}
          </span>
        </li>
      ))}
    </ul>
  );
}
