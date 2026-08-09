import { Building2, ChevronRight, Newspaper, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";

/**
 * The logged-in home at `/` — the social network. The feed is still a placeholder, but the main
 * "create" action lives here: adding a business now, expanding to events/services/etc. later.
 */
export async function SocialHome() {
  const [t, create, businesses] = await Promise.all([
    getTranslations("social"),
    getTranslations("create"),
    getTranslations("businesses"),
  ]);

  return (
    <AppShell>
      <div className="space-y-10">
        <section className="space-y-4">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {t("getStartedTitle")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("getStartedSubtitle")}
            </p>
          </div>

          {/* Create options — business for now; events/services/etc. slot in here later. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/portal/businesses/new"
              className="focus-visible:ring-ring group rounded-xl outline-none focus-visible:ring-2"
            >
              <div className="bg-card hover:border-primary/40 flex h-full items-start gap-3 rounded-xl border p-4 transition-colors">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <Building2 className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    {create("business.title")}
                    <Plus
                      className="text-muted-foreground size-3.5"
                      aria-hidden
                    />
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {create("business.subtitle")}
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <Link
            href="/portal/businesses"
            className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
          >
            {businesses("title")}
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
        </section>

        <section className="flex flex-col items-center gap-3 border-t py-10 text-center">
          <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
            <Newspaper className="size-6" />
          </div>
          <p className="text-muted-foreground max-w-sm text-sm">
            {t("comingSubtitle")}
          </p>
        </section>
      </div>
    </AppShell>
  );
}
