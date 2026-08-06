import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import { Analytics } from "@/components/analytics/analytics";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { DirectionProvider } from "@/components/direction-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { REFRESH_COOKIE } from "@/lib/auth/cookies";
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

const SITE_TITLE = "S2BR · Bringing Communities Together";
const SITE_DESCRIPTION =
  "S2BR is the Brazilian community platform for Brazilians living around the world. Discover nearby stores, food, events, and services — wherever life takes you.";

// Mobile browser chrome matches the page background (white in light, near-black in dark).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101312" },
  ],
};

export const metadata: Metadata = {
  // Absolute-URL base for og:image etc. (the `app/opengraph-image` route). Override with APP_URL
  // in production.
  metadataBase: new URL(process.env.APP_URL ?? "https://s2br.com"),
  // The landing (and any page without its own title) matches the original s2br.com; inner pages
  // set a plain title that the template suffixes. The favicon is the S2BR logo, served from the
  // `app/favicon.ico` + `app/icon.svg` file conventions.
  title: {
    default: SITE_TITLE,
    template: "%s · S2BR",
  },
  description: SITE_DESCRIPTION,
  // og:image / twitter:image are added automatically from `app/opengraph-image.tsx`.
  openGraph: {
    type: "website",
    siteName: "S2BR",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  const cookieStore = await cookies();
  const authenticated = cookieStore.has(REFRESH_COOKIE);
  const devDir =
    process.env.NODE_ENV !== "production"
      ? cookieStore.get(DEV_DIR_COOKIE)?.value
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
            <NextIntlClientProvider>
              {children}
              {/* Inside the intl provider — the banner is translated. */}
              {gaId ? <ConsentBanner /> : null}
            </NextIntlClientProvider>
          </DirectionProvider>
          <Toaster />
        </ThemeProvider>
        {gaId ? <Analytics gaId={gaId} authenticated={authenticated} /> : null}
      </body>
    </html>
  );
}
