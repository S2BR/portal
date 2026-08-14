"use client";

import { Check, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Share the profile — the Web Share sheet on devices that support it, otherwise copy the link to the
 * clipboard with a brief "copied" confirmation. A tiny client island so the rest of the page stays a
 * server component.
 */
export function ShareButton({ title }: { title: string }) {
  const t = useTranslations("businesses.public");
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="border-input hover:bg-accent focus-visible:ring-ring inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {copied ? (
        <Check className="size-4 text-emerald-600" />
      ) : (
        <Share2 className="size-4" />
      )}
      {copied ? t("linkCopied") : t("share")}
    </button>
  );
}
