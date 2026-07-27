"use client";

import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useState, type FormEvent } from "react";

import { useCurrentUser } from "@/components/auth/current-user";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Mode = "idle" | "enrolling" | "recovery" | "disabling";

export function TwoFactorSettings() {
  const t = useTranslations("twoFactor");
  const fields = useTranslations("auth.fields");
  const { user, refresh } = useCurrentUser();

  const [mode, setMode] = useState<Mode>("idle");
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!user) {
    return null;
  }

  function reset() {
    setMode("idle");
    setSecret("");
    setOtpauthUrl("");
    setCode("");
    setPassword("");
    setError(null);
  }

  async function startEnroll() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/2fa/enroll", { method: "POST" });
      if (!response.ok) {
        setError(t("invalid"));
        return;
      }
      const data = (await response.json()) as {
        secret: string;
        otpauthUrl: string;
      };
      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
      setMode("enrolling");
    } catch {
      setError(t("invalid"));
    } finally {
      setPending(false);
    }
  }

  async function confirmEnroll(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), password }),
      });
      const data = (await response.json()) as {
        status?: string;
        recoveryCodes?: string[];
      };
      if (data.status === "ok" && data.recoveryCodes) {
        setRecoveryCodes(data.recoveryCodes);
        setCode("");
        setPassword("");
        setMode("recovery");
        await refresh();
      } else {
        setError(t("invalid"));
      }
    } catch {
      setError(t("invalid"));
    } finally {
      setPending(false);
    }
  }

  async function confirmDisable(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/2fa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as { status?: string };
      if (data.status === "ok") {
        reset();
        await refresh();
      } else {
        setError(t("invalid"));
      }
    } catch {
      setError(t("invalid"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {mode === "recovery" ? (
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
        ) : mode === "enrolling" ? (
          <form onSubmit={confirmEnroll} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="tfa-password">{fields("password")}</Label>
              <Input
                id="tfa-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {t("confirm")}
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : mode === "disabling" ? (
          <form onSubmit={confirmDisable} className="space-y-4">
            <p className="text-sm">{t("disablePrompt")}</p>
            <div className="space-y-2">
              <Label htmlFor="tfa-disable-password">{fields("password")}</Label>
              <Input
                id="tfa-disable-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" disabled={pending}>
                {t("disable")}
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  user.two_factor_enabled
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {user.two_factor_enabled ? t("statusOn") : t("statusOff")}
              </span>
              {user.two_factor_enabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPassword("");
                    setError(null);
                    setMode("disabling");
                  }}
                >
                  {t("disable")}
                </Button>
              ) : (
                <Button size="sm" onClick={startEnroll} disabled={pending}>
                  {t("enable")}
                </Button>
              )}
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
