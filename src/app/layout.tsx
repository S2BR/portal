import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Analytics } from "@/components/analytics/analytics";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { CurrentUserProvider } from "@/components/auth/current-user";
import { SettingsDialogProvider } from "@/components/auth/settings-dialog";
import { DirectionProvider } from "@/components/direction-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { REFRESH_COOKIE } from "@/lib/auth/cookies";
import { decodeUser, USER_COOKIE } from "@/lib/auth/user-cookie";
import {
  DIRECTION_COOKIE,
  getDirection,
  isDirection,
  type Direction,
} from "@/i18n/config";
import "./globals.css";

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
  // Seed the header from the display cookie — no API call. The provider (mounted once here, never
  // remounted on navigation) revalidates in the background on this full load.
  const cookieUser = decodeUser(cookieStore.get(USER_COOKIE)?.value);
  // The user's chosen direction (Layout settings) overrides the locale default.
  const dirCookie = cookieStore.get(DIRECTION_COOKIE)?.value;
  const dir: Direction = isDirection(dirCookie)
    ? dirCookie
    : getDirection(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) inject data-* attributes on
          <body> before hydration; this silences that element's attribute mismatch only. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <NuqsAdapter>
          <ThemeProvider>
            <DirectionProvider dir={dir}>
              <NextIntlClientProvider>
                {/* One provider for the whole app — mounted here so it never remounts on navigation.
                  redirectOnFailure is false: public pages must not bounce to /login; protected
                  routes still guard server-side in AppShell. */}
                <CurrentUserProvider
                  initialUser={cookieUser}
                  authenticated={authenticated}
                  redirectOnFailure={false}
                >
                  <SettingsDialogProvider>{children}</SettingsDialogProvider>
                </CurrentUserProvider>
                {/* Inside the intl provider — the banner is translated. */}
                {gaId ? <ConsentBanner /> : null}
              </NextIntlClientProvider>
            </DirectionProvider>
            <Toaster />
          </ThemeProvider>
        </NuqsAdapter>
        {gaId ? (
          <>
            {/* GA base + loader emitted server-side. An inline <script> rendered by a CLIENT
                component isn't executed by React on the client (React 19 warns); server-rendered
                scripts run natively. The base sets Consent Mode v2 to denied-by-default. Analytics
                (client) only sends SPA page_views. */}
            <script
              id="ga-base"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  window.gtag = gtag;
                  gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
                  gtag('js', new Date());
                  gtag('config','${gaId}',{send_page_view:false,anonymize_ip:true});
                `,
              }}
            />
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <Analytics authenticated={authenticated} />
          </>
        ) : null}
        <SpeedInsights />
      </body>
    </html>
  );
}
