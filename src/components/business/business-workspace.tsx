"use client";

import { notFound, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

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
  const [access, setAccess] = useState<"checking" | "granted" | "denied">(
    "checking",
  );
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
        setAccess(data?.business ? "granted" : "denied");
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

  const recheck = () => setAttempt((value) => value + 1);

  // Rate limited — a transient wait, not a denial. Show the countdown and re-check when it elapses.
  if (rateLimited !== null) {
    return <RateLimited retryAfter={rateLimited} onRetry={recheck} />;
  }

  // The API is unavailable (5xx / network) — retry behind the scenes with backoff, never the 404 page.
  if (unavailable) {
    return <ServiceUnavailable onRetry={recheck} />;
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
