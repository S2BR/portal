"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Shown when a still-signed-in admin's panel session has lapsed after ~1h of inactivity (the admin
 * token expired). One click refreshes the session — which re-mints a fresh admin token — and drops
 * them back in. A revoked admin who clicks this refreshes into a token with no admin access and stays
 * out. It's the deliberate, visible "1h idle = re-enter" boundary, without forcing a full re-login.
 */
export function AdminSessionExpired() {
  const t = useTranslations("admin.expired");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function reenter() {
    setPending(true);
    try {
      // Hitting an authed BFF route forces callWithAuth to refresh the token, which re-issues the
      // admin token (if still admin-capable) and re-sets its cookie. Then re-render the gate.
      await fetch("/api/auth/me");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <span className="bg-muted flex size-12 items-center justify-center rounded-full">
        <ShieldAlert className="text-muted-foreground size-6" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={() => void reenter()} disabled={pending}>
          {t("reenter")}
        </Button>
        <Button asChild variant="outline">
          <Link href="/portal">{t("back")}</Link>
        </Button>
      </div>
    </div>
  );
}
