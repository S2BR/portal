"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/current-user";
import { VerifyDialog } from "@/components/auth/verify-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingBlock, SettingTile } from "@/components/ui/setting-tile";
import { apiErrorText } from "@/lib/api/error-text";

type Mode = "idle" | "enrolling" | "recovery";
type PasswordAction = "enroll" | "disable" | "regenerate";

export function TwoFactorSettings() {
  const t = useTranslations("twoFactor");
  const fields = useTranslations("auth.fields");
  const authErrors = useTranslations("auth.errors");
  const { user, refresh } = useCurrentUser();

  const [mode, setMode] = useState<Mode>("idle");
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [passwordAction, setPasswordAction] = useState<PasswordAction | null>(
    null,
  );

  if (!user) {
    return null;
  }

  function reset() {
    setMode("idle");
    setSecret("");
    setOtpauthUrl("");
    setCode("");
    setError(null);
  }

  async function startEnroll() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/2fa/enroll", { method: "POST" });
      const data = (await response.json()) as {
        secret?: string;
        otpauthUrl?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (!response.ok || !data.secret || !data.otpauthUrl) {
        setError(apiErrorText(data) ?? authErrors("generic"));
        return;
      }
      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
      setMode("enrolling");
    } catch {
      setError(authErrors("generic"));
    } finally {
      setPending(false);
    }
  }

  function startConfirmEnroll(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      setError(authErrors("code"));
      return;
    }
    setError(null);
    setPasswordAction("enroll");
  }

  // The three step-up-gated actions, each run from the shared dialog with the freshly
  // minted verification token. Return an error string to keep it open.
  async function confirmEnroll(token: string): Promise<string | null> {
    const response = await fetch("/api/auth/2fa/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), verification_token: token }),
    });
    const data = (await response.json()) as {
      status?: string;
      recoveryCodes?: string[];
      message?: string;
      errors?: Record<string, string[]>;
    };
    if (data.status === "ok" && data.recoveryCodes) {
      setRecoveryCodes(data.recoveryCodes);
      setCode("");
      setMode("recovery");
      await refresh();
      toast.success(t("enabledToast"));
      return null;
    }
    return apiErrorText(data) ?? authErrors("generic");
  }

  async function confirmRegenerate(token: string): Promise<string | null> {
    const response = await fetch("/api/auth/2fa/recovery-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verification_token: token }),
    });
    const data = (await response.json()) as {
      status?: string;
      recoveryCodes?: string[];
      message?: string;
      errors?: Record<string, string[]>;
    };
    if (data.status === "ok" && data.recoveryCodes) {
      setRecoveryCodes(data.recoveryCodes);
      setMode("recovery");
      toast.success(t("codesRegenerated"));
      return null;
    }
    return apiErrorText(data) ?? authErrors("generic");
  }

  async function confirmDisable(token: string): Promise<string | null> {
    const response = await fetch("/api/auth/2fa", {
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
      reset();
      await refresh();
      toast.success(t("disabledToast"));
      return null;
    }
    return apiErrorText(data) ?? authErrors("generic");
  }

  function confirmVerified(token: string): Promise<string | null> {
    if (passwordAction === "enroll") {
      return confirmEnroll(token);
    }
    if (passwordAction === "regenerate") {
      return confirmRegenerate(token);
    }
    if (passwordAction === "disable") {
      return confirmDisable(token);
    }
    return Promise.resolve(null);
  }

  return (
    <>
      {mode === "recovery" ? (
        <SettingBlock icon={ShieldCheck} label={t("title")}>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="font-medium">{t("recoveryTitle")}</p>
              <p className="text-muted-foreground text-sm">
                {t("recoverySubtitle")}
              </p>
            </div>
            <ul className="bg-muted grid grid-cols-2 gap-2 rounded-md p-3 text-center font-mono text-sm">
              {recoveryCodes.map((recoveryCode) => (
                <li key={recoveryCode}>{recoveryCode}</li>
              ))}
            </ul>
            <Button onClick={reset}>{t("done")}</Button>
          </div>
        </SettingBlock>
      ) : mode === "enrolling" ? (
        <SettingBlock icon={ShieldCheck} label={t("title")}>
          <form onSubmit={startConfirmEnroll} className="space-y-4">
            <p className="text-sm">{t("scan")}</p>
            <div className="flex justify-center">
              <div className="rounded-md bg-white p-3">
                <QRCodeSVG value={otpauthUrl} size={160} />
              </div>
            </div>
            <p className="text-muted-foreground text-center text-xs">
              {t("orEnter")}
            </p>
            <p className="bg-muted rounded-md p-2 text-center font-mono text-xs break-all">
              {secret}
            </p>
            <div className="space-y-2">
              <Label htmlFor="tfa-code">{fields("code")}</Label>
              <Input
                id="tfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit">{t("confirm")}</Button>
              <Button type="button" variant="ghost" onClick={reset}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        </SettingBlock>
      ) : (
        <div className="space-y-3">
          <SettingTile
            icon={ShieldCheck}
            label={t("title")}
            action={
              user.two_factor_enabled ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPasswordAction("regenerate")}
                  >
                    {t("regenerate")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPasswordAction("disable")}
                  >
                    {t("disable")}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={startEnroll} disabled={pending}>
                  {t("enable")}
                </Button>
              )
            }
          >
            <Badge variant={user.two_factor_enabled ? "green" : "gold"}>
              {user.two_factor_enabled ? t("statusOn") : t("statusOff")}
            </Badge>
          </SettingTile>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>
      )}
      <VerifyDialog
        open={passwordAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordAction(null);
          }
        }}
        action={
          passwordAction === "disable"
            ? "two_factor.disable"
            : passwordAction === "regenerate"
              ? "two_factor.recovery"
              : "two_factor.enable"
        }
        params={passwordAction === "enroll" ? { code: code.trim() } : undefined}
        onVerified={confirmVerified}
        description={
          passwordAction === "disable"
            ? t("disablePrompt")
            : passwordAction === "regenerate"
              ? t("regeneratePrompt")
              : undefined
        }
        confirmLabel={
          passwordAction === "disable"
            ? t("disable")
            : passwordAction === "regenerate"
              ? t("regenerate")
              : t("confirm")
        }
        destructive={passwordAction === "disable"}
      />
    </>
  );
}
