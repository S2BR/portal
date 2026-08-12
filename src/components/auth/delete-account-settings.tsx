"use client";

import { Info, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { VerifyDialog } from "@/components/auth/verify-dialog";
import { Button } from "@/components/ui/button";
import { SettingGroup } from "@/components/ui/setting-tile";
import { apiErrorText } from "@/lib/api/error-text";

/**
 * Delete (soft-delete) the signed-in account. Password-gated via the shared
 * confirmation dialog. On success the api revokes every session; the BFF clears
 * the local cookies, so we send the user back to sign in.
 */
export function DeleteAccountSettings() {
  const t = useTranslations("deleteAccount");
  const authErrors = useTranslations("auth.errors");
  const router = useRouter();

  const [open, setOpen] = useState(false);

  async function confirmDelete(token: string): Promise<string | null> {
    const response = await fetch("/api/auth/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verification_token: token }),
    });
    const data = (await response.json()) as {
      status?: string;
      message?: string;
      errors?: Record<string, string[]>;
    };
    if (data.status === "ok") {
      router.replace("/login");
      return null;
    }
    return apiErrorText(data) ?? authErrors("generic");
  }

  return (
    <SettingGroup title={t("title")} description={t("description")}>
      <div className="space-y-3">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="size-4" />
          {t("delete")}
        </Button>
        <p className="text-muted-foreground flex items-start gap-2 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{t("retentionNotice", { days: 30 })}</span>
        </p>
      </div>
      <VerifyDialog
        open={open}
        onOpenChange={setOpen}
        action="account.delete"
        onVerified={confirmDelete}
        title={t("title")}
        description={t("description")}
        confirmLabel={t("confirm")}
        destructive
      />
    </SettingGroup>
  );
}
