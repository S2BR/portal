"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/current-user";
import { decodeNotice, NOTICE_COOKIE } from "@/lib/auth/session-notice";

function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : undefined;
}

/**
 * Surfaces the one-shot session notice (see session-notice.ts) as a toast — chiefly when the switcher
 * fell back to another signed-in account because the active session ended. Reads the cookie on mount
 * and whenever the active account changes (covering both the hard-navigation promote and the
 * in-app `/me` promote), toasts once, and clears it. Renders nothing.
 */
export function SessionNotice() {
  const t = useTranslations("session");
  const { user } = useCurrentUser();

  useEffect(() => {
    const notice = decodeNotice(readCookie(NOTICE_COOKIE));
    if (!notice) {
      return;
    }
    // Clear first so a re-render can't double-toast.
    document.cookie = `${NOTICE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    toast.info(t("accountFallback", { account: notice.account }));
  }, [user?.id, t]);

  return null;
}
