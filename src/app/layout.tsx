import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import { DirectionProvider } from "@/components/direction-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { getDirection, type Direction } from "@/i18n/config";
import "./globals.css";

/** Dev/QA cookie that force-overrides the layout direction. Ignored in production. */
const DEV_DIR_COOKIE = "DEV_DIR";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "S2BR",
  description: "S2BR — for business owners and community operators.",
  icons: { icon: "/s2br.svg" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  const devDir =
    process.env.NODE_ENV !== "production"
      ? (await cookies()).get(DEV_DIR_COOKIE)?.value
      : undefined;
  const dir: Direction =
    devDir === "rtl" || devDir === "ltr" ? devDir : getDirection(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <DirectionProvider dir={dir}>
            <NextIntlClientProvider>{children}</NextIntlClientProvider>
          </DirectionProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
