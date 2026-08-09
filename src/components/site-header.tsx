import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteHeaderAuth } from "@/components/site-header-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { REFRESH_COOKIE } from "@/lib/auth/cookies";

/**
 * The shared public site header — the logo, locale switcher, theme toggle, and either "Log in"
 * (signed out) or the user menu (signed in). Used by both the marketing landing and the legal
 * pages so the two are always identical; change it once and both follow.
 */
export async function SiteHeader() {
  const t = await getTranslations("marketing");
  const authenticated = (await cookies()).has(REFRESH_COOKIE);

  return (
    <header
      className="bg-background/30 sticky top-0 z-10 border-b shadow-[0_10px_28px_-8px_rgba(0,0,0,0.06)]"
      // Explicit, un-composed value: Tailwind v4's backdrop-blur builds the filter from chained CSS
      // vars, which Safari invalidates (dropping the blur). A plain blur() with both prefixes works
      // in Safari and Chrome alike.
      style={{
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="flex h-16 w-full items-center gap-4 px-4 sm:px-6">
        <Brand />
        <div className="ms-auto flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          {authenticated ? (
            <SiteHeaderAuth />
          ) : (
            <Button asChild variant="ghost">
              <Link href="/login">{t("nav.login")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
