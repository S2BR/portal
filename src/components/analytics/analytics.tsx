"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

import {
  contentGroupFor,
  readConsent,
  updateGtagConsent,
} from "@/lib/analytics/consent";

/**
 * Google Analytics 4 under Consent Mode v2. The tag loads with every storage default set to
 * `denied`, so nothing is written to the device until the visitor accepts in the banner — which
 * makes it legal-by-default even before a choice is made. Page views are sent manually on each
 * route change (App Router client navigations don't reload), tagged with the surface's content
 * group so the landing, social feed, and owner portal report separately in one property.
 */
export function Analytics({
  gaId,
  authenticated,
}: {
  gaId: string;
  authenticated: boolean;
}) {
  const pathname = usePathname();

  // Return visit where consent was already granted — lift the default-denied state on load.
  useEffect(() => {
    if (readConsent() === "granted") {
      updateGtagConsent(true);
    }
  }, []);

  // A page_view per route change. `send_page_view:false` disables gtag's automatic first hit, so
  // this one path covers both the initial load and every client navigation.
  useEffect(() => {
    if (typeof window.gtag !== "function") {
      return;
    }
    window.gtag("event", "page_view", {
      page_path: pathname,
      content_group: contentGroupFor(pathname, authenticated),
    });
  }, [pathname, authenticated]);

  return (
    <>
      <Script id="ga-base" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
          gtag('js', new Date());
          gtag('config','${gaId}',{send_page_view:false,anonymize_ip:true});
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
    </>
  );
}
