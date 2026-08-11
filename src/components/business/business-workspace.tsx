"use client";

import { notFound, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import {
  BusinessDashboardSkeleton,
  BusinessFormSkeleton,
} from "@/components/business/business-skeletons";
import { RateLimited } from "@/components/ui/rate-limited";
import { parseRateLimit } from "@/lib/rate-limit";

/**
 * Gates the business content on access. The dashboard and placeholder pages would otherwise render
 * their data for anyone with the URL — so after a profile switch (AccountBoundary re-mounts this), an
 * account that doesn't own the business would briefly see it. We confirm access first (the API 404s a
 * business the account can't see) and, when denied, render the not-found page. While checking we show
 * a skeleton of the page (the sidebar, which only lists the account's own companies, renders
 * immediately from the layout) — no business data appears until access is granted.
 *
 * A rate-limited check is NOT a denial: throttling must never render the 404 page (it did, because
 * any non-ok was treated as denied). On a 429 we show the wait with an auto-retry instead, and only a
 * real 404 sends the visitor to not-found.
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
  // Bumped to re-run the access check (auto-retry when the rate-limit wait elapses).
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before each (re)check
    setRateLimited(null);
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
          setRateLimited(limit.retryAfter);
          return;
        }
        if (!response.ok) {
          setAccess("denied");
          return;
        }
        setAccess(data?.business ? "granted" : "denied");
      } catch {
        if (active) {
          setAccess("denied");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, attempt]);

  // Rate limited — a transient wait, not a denial. Show the countdown and re-check when it elapses.
  if (rateLimited !== null) {
    return (
      <RateLimited
        retryAfter={rateLimited}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    );
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
