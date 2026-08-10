"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { VerifyDialog } from "@/components/auth/verify-dialog";
import { Button } from "@/components/ui/button";
import { SettingTile } from "@/components/ui/setting-tile";
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
    <>
      <SettingTile
        icon={Trash2}
        tone="danger"
        subtitle={t("description")}
        action={
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
          >
            {t("delete")}
          </Button>
        }
      >
        {t("title")}
      </SettingTile>
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
    </>
  );
}
