"use client";

import { BadgeCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { ClaimTarget } from "@/app/api/claims/route";
import { useCurrentUser } from "@/components/auth/current-user";

const DISMISS_KEY = "s2br_claimable_dismissed";

/** The public page for a claimable target, when it has one (a business today). */
function targetHref(target: ClaimTarget): string | null {
  if (target.type === "business") {
    return `/businesses/${encodeURIComponent(target.id)}`;
  }
  return null;
}

/**
 * The post-login "you can claim these" banner. Once a signed-in user lands anywhere in the app it
 * asks the API what they can claim (by verified email match); if there's anything, it shows a slim,
 * dismissible bar inviting them to take ownership. Dismissal is remembered for the browser session so
 * it doesn't nag on every navigation. Silent for signed-out visitors and whenever the list is empty
 * or the lookup fails — it never blocks the page.
 */
export function ClaimableAlert() {
  const t = useTranslations("claimableAlert");
  const { user } = useCurrentUser();

  const [targets, setTargets] = useState<ClaimTarget[]>([]);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }
    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      return;
    }

    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/claims/claimable");
        if (!response.ok) {
          return;
        }
        const body = (await response.json()) as { data?: ClaimTarget[] };
        if (active && body.data && body.data.length > 0) {
          setTargets(body.data);
          setDismissed(false);
        }
      } catch {
        // A hiccup just means no prompt — never surface an error here.
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  if (dismissed || targets.length === 0) {
    return null;
  }

  const count = targets.length;
  // The first target's page, or — if the first has no public surface — the first that does.
  const primaryHref = targets.reduce<string | null>(
    (href, target) => href ?? targetHref(target),
    null,
  );

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="border-primary/20 bg-primary/5 mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-3 text-sm">
      <BadgeCheck className="text-primary size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <span className="font-semibold">{t("title", { count })}</span>{" "}
        <span className="text-muted-foreground">{t("body", { count })}</span>
      </div>
      {primaryHref ? (
        <Link
          href={primaryHref}
          onClick={dismiss}
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex shrink-0 items-center rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {t("cta", { count })}
        </Link>
      ) : null}
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("dismiss")}
        className="hover:bg-primary/10 focus-visible:ring-ring inline-flex shrink-0 items-center justify-center rounded-md p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
