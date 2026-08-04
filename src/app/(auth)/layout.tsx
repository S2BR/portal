import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const t = await getTranslations("auth");

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel — large screens only. Carries the S2BR identity + value proposition. */}
      <aside className="from-brand-green-deep via-brand-green to-brand-green-deep relative hidden overflow-hidden bg-gradient-to-br shadow-[inset_-16px_0_28px_-16px_rgba(0,0,0,0.4)] lg:flex lg:flex-col lg:justify-center lg:p-12">
        {/* Ambient drift — slow, abstract movement. Respects prefers-reduced-motion (see globals.css). */}
        <div
          aria-hidden
          className="auth-blob-1 pointer-events-none absolute -end-24 -top-24 size-96 rounded-full bg-white/18 blur-3xl"
        />
        <div
          aria-hidden
          className="auth-blob-2 bg-brand-gold/28 pointer-events-none absolute -start-16 -bottom-32 size-[28rem] rounded-full blur-3xl"
        />
        <div
          aria-hidden
          className="auth-blob-3 bg-brand-green-deep/30 pointer-events-none absolute start-1/4 top-1/3 size-72 rounded-full blur-3xl"
        />

        <div className="relative max-w-md space-y-8">
          <Image
            src="/s2br.svg"
            alt="S2BR"
            width={112}
            height={112}
            priority
            unoptimized
            className="size-28 rounded-2xl drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
          />
          <div className="space-y-4">
            <p className="font-heading text-4xl leading-tight font-semibold text-balance text-white">
              {t("tagline")}
            </p>
            <p className="text-lg text-white/75">{t("taglineSub")}</p>
          </div>
        </div>
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
