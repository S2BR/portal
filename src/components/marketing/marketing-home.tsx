import {
  CalendarDays,
  Store,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Brand } from "@/components/brand";
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

  const features: {
    key: "stores" | "food" | "events" | "services";
    Icon: LucideIcon;
  }[] = [
    { key: "stores", Icon: Store },
    { key: "food", Icon: UtensilsCrossed },
    { key: "events", Icon: CalendarDays },
    { key: "services", Icon: Wrench },
  ];

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
            <span className="border-primary/30 bg-primary/5 text-primary inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
              {t("hero.launch")}
            </span>
            <h1 className="font-heading text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/register">{t("hero.ctaPrimary")}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">{t("hero.ctaSecondary")}</Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl shadow-lg lg:ms-auto">
            <Image
              src="/images/side_image_01.jpg"
              alt={t("hero.caption")}
              width={800}
              height={1200}
              priority
              sizes="(min-width: 1024px) 24rem, 100vw"
              className="h-auto w-full object-cover"
            />
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {features.map(({ key, Icon }) => (
              <div
                key={key}
                className="bg-card flex items-center gap-3 rounded-xl border p-4"
              >
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-5" />
                </span>
                <span className="font-medium">{t(`features.${key}`)}</span>
              </div>
            ))}
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
