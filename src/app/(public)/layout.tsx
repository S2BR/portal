import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SiteHeader } from "@/components/site-header";

/**
 * Shell for the PUBLIC, logged-out-friendly surfaces (the business directory + profile pages). Same
 * public `SiteHeader` the marketing and legal pages use — it shows "Log in" or the user menu on its
 * own — with no auth gate. `CurrentUserProvider` (mounted at the root) never bounces these to login.
 */
export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations("legal");
  const directory = await getTranslations("businesses.directory");

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex-1">{children}</main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm sm:px-6">
          <Link href="/businesses" className="hover:text-foreground">
            {directory("title")}
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            {t("terms")}
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            {t("privacy")}
          </Link>
          <Link href="/" className="hover:text-foreground ms-auto">
            {t("backToApp")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
