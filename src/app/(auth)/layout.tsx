import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [t, brand] = await Promise.all([
    getTranslations("auth"),
    getTranslations("brand"),
  ]);

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      {/* Brand panel — large screens only. Carries the S2BR identity + value proposition. */}
      <aside className="from-brand-green-deep via-brand-green to-brand-green-deep relative hidden overflow-hidden bg-gradient-to-br lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="bg-brand-gold/20 pointer-events-none absolute -start-16 -bottom-32 size-[28rem] rounded-full blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <Image
            src="/s2br.svg"
            alt=""
            width={44}
            height={44}
            priority
            unoptimized
            className="size-11 rounded-xl bg-white/95 p-1.5"
          />
          <span className="text-lg font-semibold text-white">
            {brand("name")}
          </span>
        </div>

        <div className="relative max-w-md space-y-4">
          <p className="font-heading text-4xl leading-tight font-semibold text-balance text-white">
            {t("tagline")}
          </p>
          <p className="text-lg text-white/75">{t("taglineSub")}</p>
        </div>

        <div className="relative h-6" />
      </aside>

      {/* Form panel */}
      <div className="relative flex min-h-full flex-col">
        <div className="flex items-center justify-end gap-2 p-4">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          {children}
        </div>
      </div>
    </div>
  );
}
