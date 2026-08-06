import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SiteHeader } from "@/components/site-header";

export default async function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations("legal");

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm sm:px-6">
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
