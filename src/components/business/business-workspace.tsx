"use client";

import { notFound, usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { BusinessLocked } from "@/components/business/business-locked";
import {
  BusinessDashboardSkeleton,
  BusinessFormSkeleton,
} from "@/components/business/business-skeletons";
import { RateLimited } from "@/components/ui/rate-limited";
import { ServiceUnavailable } from "@/components/ui/service-unavailable";
import { parseRateLimit } from "@/lib/rate-limit";

/**
 * Gates the business content on access. The dashboard and placeholder pages would otherwise render
 * their data for anyone with the URL — so after a profile switch (AccountBoundary re-mounts this), an
 * account that doesn't own the business would briefly see it. We confirm access first (the API 404s a
 * business the account can't see) and, when denied, render the not-found page. While checking we show
 * a skeleton of the page (the sidebar, which only lists the account's own companies, renders
 * immediately from the layout) — no business data appears until access is granted.
 *
 * The outcome is triaged so only a genuine 404 reaches the not-found page: a 429 shows the rate-limit
 * wait, and an unavailable API (5xx / network) shows the service-unavailable state with backoff — a
 * down API must never masquerade as "this business doesn't exist".
 */
export function BusinessWorkspace({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [access, setAccess] = useState<"checking" | "granted" | "denied">(
    "checking",
  );
  // The business's canonical `name-slug-<code>`; when the url uses a stale name (after a rename), we
  // 301-style replace to it — the code still resolves, so old links/QRs never break.
  const [canonicalSlug, setCanonicalSlug] = useState<string | null>(null);
  // An operator-locked listing: the owner sees a notice instead of the workspace and can't edit.
  const [locked, setLocked] = useState(false);
  const [rateLimited, setRateLimited] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  // Bumped to re-run the access check (an auto-retry from either transient state).
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(
          `/api/businesses/${encodeURIComponent(slug)}`,
        );
        if (!active) {
          return;
        }
        const data = (await response.json().catch(() => null)) as {
          business?: unknown;
          status?: string;
          retry_after?: number | null;
        } | null;
        // Throttled — show the wait + auto-retry, never the 404 page.
        const limit = parseRateLimit(response.status, data);
        if (limit) {
          setUnavailable(false);
          setRateLimited(limit.retryAfter);
          return;
        }
        // Only a genuine 404 means "not yours / gone".
        if (response.status === 404) {
          setAccess("denied");
          return;
        }
        // Operator-locked — the API refuses the data (403) and returns no business; show the notice.
        if (response.status === 403 && data?.status === "business_locked") {
          setRateLimited(null);
          setUnavailable(false);
          setLocked(true);
          return;
        }
        // Any other failure is the API being unavailable, not a denial. Don't reset `unavailable`
        // to false first — keeping it true holds the ServiceUnavailable panel mounted so its backoff
        // counter persists across retries (setting the same value is a no-op).
        if (!response.ok) {
          setRateLimited(null);
          setUnavailable(true);
          return;
        }
        setRateLimited(null);
        setUnavailable(false);
        const business = data?.business as
          | { slug?: string; is_locked?: boolean }
          | undefined;
        setCanonicalSlug(business?.slug ?? null);
        setLocked(business?.is_locked ?? false);
        setAccess(business ? "granted" : "denied");
      } catch {
        if (active) {
          setRateLimited(null);
          setUnavailable(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, attempt]);

  // Self-healing url: once we know the canonical slug, replace a stale-name url with it (keeping the
  // current sub-path). Separate from the access fetch so ordinary sub-navigation doesn't re-fetch.
  useEffect(() => {
    if (canonicalSlug && canonicalSlug !== slug) {
      const rest = pathname.slice(`/portal/businesses/${slug}`.length);
      router.replace(`/portal/businesses/${canonicalSlug}${rest}`);
    }
  }, [canonicalSlug, slug, pathname, router]);

  const recheck = () => setAttempt((value) => value + 1);

  // Rate limited — a transient wait, not a denial. Show the countdown and re-check when it elapses.
  if (rateLimited !== null) {
    return <RateLimited retryAfter={rateLimited} onRetry={recheck} />;
  }

  // The API is unavailable (5xx / network) — retry behind the scenes with backoff, never the 404 page.
  if (unavailable) {
    return <ServiceUnavailable onRetry={recheck} />;
  }

  // Locked by an operator — the API served no data (403), so show the notice regardless of the
  // access state (it never reaches "granted" for a locked listing).
  if (locked) {
    return <BusinessLocked />;
  }

  // A business this account can't see (e.g. after a profile switch) renders the 404 page.
  if (access === "denied") {
    notFound();
  }

  if (access !== "granted") {
    // Show the shape of the page being entered (the sidebar is already rendered by the layout)
    // instead of a spinner, so the workspace appears immediately and only the content fills in once
    // access is confirmed. The information page is the detail form; everything else lands on the
    // dashboard-style overview.
    return pathname.endsWith("/information") ? (
      <BusinessFormSkeleton />
    ) : (
      <BusinessDashboardSkeleton />
    );
  }

  return <>{children}</>;
}
