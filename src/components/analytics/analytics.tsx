"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  contentGroupFor,
  readConsent,
  updateGtagConsent,
} from "@/lib/analytics/consent";

/**
 * Google Analytics 4 SPA page-view tracking under Consent Mode v2. The gtag base + loader scripts
 * are emitted server-side from the root layout (an inline script rendered by a client component
 * isn't executed by React on the client). This component only lifts previously-granted consent on
 * load and sends a page_view on each App Router navigation (which don't reload the page), tagged
 * with the surface's content group so landing, social feed, and owner portal report separately.
 */
export function Analytics({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();

  // Return visit where consent was already granted — lift the default-denied state on load.
  useEffect(() => {
    if (readConsent() === "granted") {
      updateGtagConsent(true);
    }
  }, []);

  // A page_view per route change. `send_page_view:false` (set in the base script) disables gtag's
  // automatic first hit, so this one path covers both the initial load and every client navigation.
  useEffect(() => {
    if (typeof window.gtag !== "function") {
      return;
    }
    window.gtag("event", "page_view", {
      page_path: pathname,
      content_group: contentGroupFor(pathname, authenticated),
    });
  }, [pathname, authenticated]);

  return null;
}
