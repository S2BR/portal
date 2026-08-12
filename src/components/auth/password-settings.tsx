"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { PasswordRequirements } from "@/components/auth/password-requirements";
import { VerifyDialog } from "@/components/auth/verify-dialog";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  SettingBlock,
  SettingGroup,
  SettingTile,
} from "@/components/ui/setting-tile";
import { apiErrorText } from "@/lib/api/error-text";
import { checkPassword } from "@/lib/auth/password";
import { useAppConfig } from "@/lib/config/use-app-config";

/**
 * Change the signed-in account's password. The new password is validated against
 * the live policy inline; the *current* password is collected in the shared
 * confirmation dialog on save. On success the api signs out every other session.
 */
export function PasswordSettings() {
  const t = useTranslations("passwordSettings");
  const fields = useTranslations("auth.fields");
  const authErrors = useTranslations("auth.errors");
  const config = useAppConfig();

  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function reset() {
    setEditing(false);
    setPassword("");
    setConfirm("");
    setError(null);
  }

  function startChange(event: FormEvent) {
    event.preventDefault();
    if (config && checkPassword(password, config.password)) {
      setError(authErrors("passwordPolicy"));
      return;
    }
    if (password !== confirm) {
      setError(authErrors("passwordMismatch"));
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  // Runs from the verify dialog with the freshly minted token (bound to the new password).
  async function submitChange(token: string): Promise<string | null> {
    const response = await fetch("/api/auth/password/change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verification_token: token,
        password,
        password_confirmation: confirm,
      }),
    });
    const data = (await response.json()) as {
      status?: string;
      message?: string;
      errors?: Record<string, string[]>;
    };
    if (data.status === "ok") {
      reset();
      toast.success(t("success"));
      return null;
    }
    return apiErrorText(data) ?? authErrors("generic");
  }

  return (
    <SettingGroup title={t("title")} description={t("hint")}>
      {editing ? (
        <SettingBlock>
          <form onSubmit={startChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("newPassword")}</Label>
              <PasswordInput
                id="new-password"

                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
              />
              {config ? (
                <PasswordRequirements
                  password={password}
                  policy={config.password}
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                {fields("confirmPassword")}
              </Label>
              <PasswordInput
                id="confirm-password"

                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit">{t("submit")}</Button>
              <Button type="button" variant="ghost" onClick={reset}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        </SettingBlock>
      ) : (
        <SettingTile icon={Lock} onClick={() => setEditing(true)}>
          ••••••••
        </SettingTile>
      )}
      <VerifyDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        action="password.change"
        params={{ password }}
        onVerified={submitChange}
        confirmLabel={t("submit")}
      />
    </SettingGroup>
  );
}
