import { getTranslations } from "next-intl/server";
import { Fragment } from "react";

import { BrazilOutline } from "@/components/marketing/brazil-outline";
import { NotifyForm } from "@/components/marketing/notify-form";
import { SiteHeader } from "@/components/site-header";

/**
 * The public landing at `/` for logged-out visitors (mirrors the content of s2br.com). Logged-in
 * visitors get the social home instead — see src/app/page.tsx.
 */
export async function MarketingHome() {
  const t = await getTranslations("marketing");
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex flex-1 flex-col justify-center">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <h1 className="font-heading text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg">
              {t("hero.subtitle")}
            </p>
            <p className="text-xl font-medium">
              <span className="text-muted-foreground">
                {t("hero.launchPrefix")}
              </span>{" "}
              <span className="relative ms-1 inline-flex">
                <span
                  aria-hidden
                  className="launch-glow absolute inset-0 opacity-30 blur-xl"
                />
                <span className="launch-glow relative bg-clip-text font-semibold text-transparent">
                  {t("hero.launchDate")}
                </span>
              </span>
            </p>

            <NotifyForm />
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:ms-auto">
            <BrazilOutline />
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:px-6">
          <nav className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {(
              ["products", "services", "news", "events", "social"] as const
            ).map((key, index) => (
              <Fragment key={key}>
                {index > 0 ? (
                  <span aria-hidden className="text-muted-foreground/50">
                    ·
                  </span>
                ) : null}
                <span>{t(`footer.${key}`)}</span>
              </Fragment>
            ))}
          </nav>
          <span className="sm:ms-auto">{t("footer.rights", { year })}</span>
        </div>
      </footer>
    </div>
  );
}
