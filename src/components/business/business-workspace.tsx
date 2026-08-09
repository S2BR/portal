"use client";

import { notFound, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import {
  BusinessDashboardSkeleton,
  BusinessFormSkeleton,
} from "@/components/business/business-skeletons";

/**
 * Gates the business content on access. The dashboard and placeholder pages would otherwise render
 * their data for anyone with the URL — so after a profile switch (AccountBoundary re-mounts this), an
 * account that doesn't own the business would briefly see it. We confirm access first (the API 404s a
 * business the account can't see) and, when denied, render the not-found page. While checking we show
 * a skeleton of the page (the sidebar, which only lists the account's own companies, renders
 * immediately from the layout) — no business data appears until access is granted.
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
        if (!response.ok) {
          setAccess("denied");
          return;
        }
        const data = (await response.json()) as { business?: unknown };
        setAccess(data.business ? "granted" : "denied");
      } catch {
        if (active) {
          setAccess("denied");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

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
