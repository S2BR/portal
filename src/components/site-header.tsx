import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

/**
 * The shared public site header — the logo, locale switcher, theme toggle, and "Log in". Used by
 * both the marketing landing and the legal pages so the two are always identical; change it once
 * and both follow.
 */
export async function SiteHeader() {
  const t = await getTranslations("marketing");

  return (
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
  );
}
