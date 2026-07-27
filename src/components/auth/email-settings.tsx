"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { useCurrentUser } from "@/components/auth/current-user";
import { OtpInput } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOtpLength } from "@/lib/config/use-app-config";

type Mode = "idle" | "changing" | "verifying";

export function EmailSettings() {
  const t = useTranslations("emailSettings");
  const fields = useTranslations("auth.fields");
  const authErrors = useTranslations("auth.errors");
  const { user, refresh } = useCurrentUser();

  const [mode, setMode] = useState<Mode>("idle");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const otpLength = useOtpLength();

  if (!user) {
    return null;
  }

  function reset() {
    setMode("idle");
    setNewEmail("");
    setPassword("");
    setCode("");
    setError(null);
  }

  async function requestChange(event: FormEvent) {
    event.preventDefault();
    if (!newEmail.includes("@")) {
      setError(authErrors("email"));
      return;
    }
    if (!password) {
      setError(authErrors("password"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/email/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password }),
      });
      const data = (await response.json()) as {
        status?: string;
        message?: string;
      };
      if (data.status === "verification_required") {
        setPassword("");
        setMode("verifying");
      } else {
        setError(data.message ?? authErrors("generic"));
      }
    } catch {
      setError(authErrors("generic"));
    } finally {
      setPending(false);
    }
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
      };
      if (data.status === "ok") {
        reset();
        await refresh();
      } else {
        setError(data.message ?? authErrors("generic"));
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
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {mode === "verifying" ? (
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
        ) : mode === "changing" ? (
          <form onSubmit={requestChange} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="email-password">{fields("password")}</Label>
              <Input
                id="email-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {t("submit")}
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <span className="truncate text-sm">{user.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewEmail("");
                setPassword("");
                setError(null);
                setMode("changing");
              }}
            >
              {t("change")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
