"use client";

import { Loader2 } from "lucide-react";
import { notFound } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Gates the company workspace on access. The company sidebar, dashboard, and placeholder pages would
 * otherwise render for anyone with the URL — so after a profile switch (AccountBoundary re-mounts
 * this), an account that doesn't own the company would see an empty shell. Instead we confirm access
 * first (the API 404s a company the account can't see) and, when denied, render the not-found page.
 * Nothing of the company renders until access is granted.
 */
export function CompanyWorkspace({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
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

  // A company this account can't see (e.g. after a profile switch) renders the 404 page.
  if (access === "denied") {
    notFound();
  }

  if (access !== "granted") {
    // Cancel the app shell's vertical padding and fill the area below the header, so the spinner
    // sits at the center of the screen instead of the top of a half-height box.
    return (
      <div className="-my-10 flex min-h-[calc(100svh-4rem)] items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
