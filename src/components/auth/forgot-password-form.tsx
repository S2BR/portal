"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { OtpInput } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorText } from "@/lib/api/error-text";
import type { AppConfig } from "@/lib/api/types";
import { checkPassword } from "@/lib/auth/password";
import { useOtpLength } from "@/lib/config/use-app-config";

export function ForgotPasswordForm({
  passwordPolicy,
}: {
  passwordPolicy: AppConfig["password"];
}) {
  const t = useTranslations("auth");
  const router = useRouter();

  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const otpLength = useOtpLength();

  async function onRequest(event: FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      setError(t("errors.email"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStep("reset");
    } catch {
      setError(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  async function onReset(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      setError(t("errors.code"));
      return;
    }
    if (checkPassword(password, passwordPolicy)) {
      setError(t("errors.passwordPolicy"));
      return;
    }
    if (password !== confirm) {
      setError(t("errors.passwordMismatch"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: code.trim(),
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
        router.push("/login");
        return;
      }
      setError(apiErrorText(data) ?? t("errors.generic"));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  if (step === "reset") {
    return (
      <form onSubmit={onReset} className="flex flex-col gap-4">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            {t("forgot.resetTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("forgot.resetSubtitle", { email })}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">{t("fields.code")}</Label>
          <OtpInput
            id="code"
            length={otpLength}
            value={code}
            onChange={setCode}
            autoFocus
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("fields.password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            {t("register.passwordHint", { min: passwordPolicy.min })}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t("fields.confirmPassword")}</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {t("forgot.resetSubmit")}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onRequest} className="flex flex-col gap-4">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("forgot.title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("forgot.subtitle")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("fields.email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoFocus
        />
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {t("forgot.submit")}
      </Button>
    </form>
  );
}
