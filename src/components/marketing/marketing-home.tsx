import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Brand } from "@/components/brand";
import { BrazilOutline } from "@/components/marketing/brazil-outline";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

/**
 * The public landing at `/` for logged-out visitors (mirrors the content of s2br.com). Logged-in
 * visitors get the social home instead — see src/app/page.tsx.
 */
export async function MarketingHome() {
  const t = await getTranslations("marketing");
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Brand />
          <div className="ms-auto flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
            <Button asChild variant="ghost">
              <Link href="/login">{t("nav.login")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <h1 className="font-heading text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg">
              {t("hero.subtitle")}
            </p>
            <p className="text-base font-medium">
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
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:ms-auto">
            <BrazilOutline />
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:px-6">
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {(
              ["products", "services", "news", "events", "social"] as const
            ).map((key) => (
              <span key={key} className="hover:text-foreground cursor-default">
                {t(`footer.${key}`)}
              </span>
            ))}
          </nav>
          <span className="sm:ms-auto">{t("footer.rights", { year })}</span>
        </div>
      </footer>
    </div>
  );
}
