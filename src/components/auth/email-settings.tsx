"use client";

import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { useCurrentUser } from "@/components/auth/current-user";
import { OtpInput } from "@/components/auth/otp-input";
import { VerifyDialog } from "@/components/auth/verify-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingBlock, SettingTile } from "@/components/ui/setting-tile";
import { apiErrorText } from "@/lib/api/error-text";
import { useOtpLength } from "@/lib/config/use-app-config";

type Mode = "idle" | "changing" | "verifying";

export function EmailSettings() {
  const t = useTranslations("emailSettings");
  const fields = useTranslations("auth.fields");
  const authErrors = useTranslations("auth.errors");
  const { user, refresh } = useCurrentUser();

  const [mode, setMode] = useState<Mode>("idle");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const otpLength = useOtpLength();

  if (!user) {
    return null;
  }

  function reset() {
    setMode("idle");
    setNewEmail("");
    setCode("");
    setError(null);
  }

  function startChange(event: FormEvent) {
    event.preventDefault();
    if (!newEmail.includes("@")) {
      setError(authErrors("email"));
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  // Runs from the verify dialog with the freshly minted token. A `verification_required`
  // reply advances us to the code step; anything else is surfaced inline in the dialog.
  async function requestChange(token: string): Promise<string | null> {
    const response = await fetch("/api/auth/email/change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, verification_token: token }),
    });
    const data = (await response.json()) as {
      status?: string;
      message?: string;
      errors?: Record<string, string[]>;
    };
    if (data.status === "verification_required") {
      setMode("verifying");
      return null;
    }
    return apiErrorText(data) ?? authErrors("generic");
  }

  async function verifyCode(codeValue: string) {
    if (!codeValue.trim()) {
      setError(authErrors("code"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeValue.trim() }),
      });
      const data = (await response.json()) as {
        status?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (data.status === "ok") {
        reset();
        await refresh();
      } else {
        setError(apiErrorText(data) ?? authErrors("generic"));
      }
    } catch {
      setError(authErrors("generic"));
    } finally {
      setPending(false);
    }
  }

  function verifyChange(event: FormEvent) {
    event.preventDefault();
    void verifyCode(code);
  }

  return (
    <>
      {mode === "verifying" ? (
        <SettingBlock icon={Mail} label={t("title")}>
          <form onSubmit={verifyChange} className="space-y-4">
            <p className="text-sm">{t("verifyTitle")}</p>
            <p className="text-muted-foreground text-sm">
              {t("verifySubtitle", { email: newEmail })}
            </p>
            <div className="space-y-2">
              <Label htmlFor="email-code">{fields("code")}</Label>
              <OtpInput
                id="email-code"
                length={otpLength}
                value={code}
                onChange={setCode}
                autoFocus
                disabled={pending}
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {t("verifySubmit")}
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        </SettingBlock>
      ) : mode === "changing" ? (
        <SettingBlock icon={Mail} label={t("title")}>
          <form onSubmit={startChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">{t("newEmail")}</Label>
              <Input
                id="new-email"
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                autoFocus
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
        <SettingTile
          icon={Mail}
          label={t("title")}
          onClick={() => {
            setNewEmail("");
            setError(null);
            setMode("changing");
          }}
        >
          {user.email}
        </SettingTile>
      )}
      <VerifyDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        action="email.change"
        params={{ email: newEmail }}
        onVerified={requestChange}
        confirmLabel={t("submit")}
      />
    </>
  );
}
