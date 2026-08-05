import { Newspaper } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/app-shell";

/**
 * The logged-in home at `/` — the social network. A placeholder for now; the real feed and
 * community surfaces get built here per the upcoming design instructions.
 */
export async function SocialHome() {
  const t = await getTranslations("social");

  return (
    <AppShell>
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-2xl">
          <Newspaper className="size-8" />
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("comingTitle")}
        </h1>
        <p className="text-muted-foreground">{t("comingSubtitle")}</p>
      </div>
    </AppShell>
  );
}
