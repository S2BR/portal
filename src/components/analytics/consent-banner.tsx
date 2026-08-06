"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  readConsent,
  updateGtagConsent,
  writeConsent,
} from "@/lib/analytics/consent";

/**
 * A discreet, bottom-corner analytics consent bar — not a page-blocking modal. Shown only until
 * the visitor decides; Accept and Decline are given equal weight (no accept-only dark pattern).
 * The choice grants or keeps-denied gtag's analytics storage and is remembered so the bar stays
 * gone.
 */
export function ConsentBanner() {
  const t = useTranslations("consent");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Decide on the client — the cookie isn't readable during SSR, so this avoids a hydration
    // flash where the bar renders then vanishes for a returning visitor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(readConsent() === null);
  }, []);

  if (!visible) {
    return null;
  }

  function decide(granted: boolean) {
    writeConsent(granted ? "granted" : "denied");
    updateGtagConsent(granted);
    setVisible(false);
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 fixed inset-x-4 bottom-4 z-50 duration-300 motion-reduce:animate-none sm:right-auto sm:left-4 sm:max-w-sm">
      <div className="bg-background/95 rounded-lg border p-4 shadow-lg backdrop-blur">
        <p className="text-muted-foreground text-sm">
          {t("message")}{" "}
          <Link
            href="/privacy"
            className="text-foreground underline underline-offset-2"
          >
            {t("learnMore")}
          </Link>
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => decide(true)}>
            {t("accept")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => decide(false)}>
            {t("decline")}
          </Button>
        </div>
      </div>
    </div>
  );
}
