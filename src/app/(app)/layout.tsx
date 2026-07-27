import { getTranslations } from "next-intl/server";

import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations("nav");

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
          <Brand />
          <div className="ml-auto flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
            {/* Wired to the BFF logout handler with the auth flows. */}
            <Button variant="outline" size="sm">
              {t("signOut")}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
