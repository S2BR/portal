"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Shown in place of the workspace when an operator has locked a business. The owner can see that
 * it's locked and is pointed at support, but can't edit it (the API also refuses any change). The
 * reason is intentionally not surfaced.
 */
export function BusinessLocked() {
  const t = useTranslations("businesses.locked");

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="bg-destructive/10 text-destructive mx-auto flex size-12 items-center justify-center rounded-full">
          <Lock className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          {t("body")}
        </p>
      </div>
    </div>
  );
}
