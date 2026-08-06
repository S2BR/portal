/**
 * Client-side consent + Google Analytics helpers. Analytics run under Consent Mode v2: the tag
 * loads with every storage default set to `denied`, so nothing is written to the device until the
 * visitor accepts in the banner. The choice is remembered in a first-party, non-httpOnly cookie
 * (the client reads it to decide whether to show the banner and whether to grant gtag consent).
 */

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export const CONSENT_COOKIE = "s2br_consent";

export type ConsentValue = "granted" | "denied";

/** The stored decision, or null when the visitor hasn't chosen yet (banner not yet answered). */
export function readConsent(): ConsentValue | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(
    /(?:^|;\s*)s2br_consent=(granted|denied)/,
  );
  return match ? (match[1] as ConsentValue) : null;
}

/** Persist the decision for 180 days (first-party, Lax) so the banner doesn't reappear. */
export function writeConsent(value: ConsentValue): void {
  const maxAge = 60 * 60 * 24 * 180;
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** Tell gtag whether analytics storage is now allowed (Consent Mode update). */
export function updateGtagConsent(granted: boolean): void {
  if (typeof window.gtag !== "function") {
    return;
  }
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
  });
}

/** Auth pages — reachable without a session; grouped separately from user surfaces. */
const AUTH_PATHS = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/magic-link",
];

/**
 * The GA4 content group for a route, so each surface reports separately without a second property:
 * the business-owner portal, account settings, the auth pages, and the shared `/` home (which is
 * the marketing landing when logged out and the social feed when logged in).
 */
export function contentGroupFor(
  pathname: string,
  authenticated: boolean,
): string {
  if (pathname.startsWith("/portal")) {
    return "owner-portal";
  }
  if (pathname.startsWith("/profile")) {
    return "settings";
  }
  if (
    AUTH_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return "auth";
  }
  if (pathname === "/") {
    return authenticated ? "social" : "landing";
  }
  return "other";
}
