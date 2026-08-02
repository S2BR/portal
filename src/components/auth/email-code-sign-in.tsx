"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { OtpInput } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorText } from "@/lib/api/error-text";
import { useOtpLength } from "@/lib/config/use-app-config";

type Step = "request" | "verify";

/**
 * Passwordless sign-in with an emailed one-time code. Because the API consumes
 * the code before the 2FA check, a 2FA account must send its authenticator code
 * alongside the emailed code — so the verify step offers an optional 2FA field
 * and, if the account is challenged without it, guides the user to resend.
 */
export function EmailCodeSignIn({
  nextPath,
  onBack,
  initialEmail = "",
}: {
  nextPath: string;
  onBack: () => void;
  initialEmail?: string;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const otpLength = useOtpLength();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function requestCode(): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as {
        status?: string;
        message?: string;
      };
      if (data.status === "code_sent") {
        return true;
      }
      if (data.status === "rate_limited") {
        setError(t("errors.rateLimited"));
        return false;
      }
      setError(data.message ?? t("errors.generic"));
      return false;
    } catch {
      setError(t("errors.generic"));
      return false;
    } finally {
      setPending(false);
    }
  }

  async function onRequest(event: FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      setError(t("errors.email"));
      return;
    }
    if (await requestCode()) {
      setCode("");
      setTwoFactorCode("");
      setStep("verify");
    }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      setError(t("errors.code"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: code.trim(),
          ...(twoFactorCode.trim()
            ? { two_factor_code: twoFactorCode.trim() }
            : {}),
        }),
      });
      const data = (await response.json()) as {
        status?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (data.status === "authenticated") {
        router.replace(nextPath);
        router.refresh();
        return;
      }
      if (data.status === "two_factor_required") {
        // The emailed code was consumed; a fresh one is needed with the 2FA code.
        setCode("");
        setError(t("emailCode.twoFactorRequired"));
        return;
      }
      if (data.status === "rate_limited") {
        setError(t("errors.rateLimited"));
        return;
      }
      setError(apiErrorText(data) ?? t("errors.generic"));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  if (step === "request") {
    return (
      <form onSubmit={onRequest} className="flex flex-col gap-4">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            {t("emailCode.requestTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("emailCode.requestSubtitle")}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email-code-email">{t("fields.email")}</Label>
          <Input
            id="email-code-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoFocus
          />
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {t("emailCode.sendButton")}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          {t("emailCode.back")}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onVerify} className="flex flex-col gap-4">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("emailCode.verifyTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("emailCode.verifySubtitle", { email })}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-code">{t("fields.code")}</Label>
        <OtpInput
          id="email-code"
          length={otpLength}
          value={code}
          onChange={setCode}
          autoFocus
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-code-2fa">{t("emailCode.twoFactorLabel")}</Label>
        <Input
          id="email-code-2fa"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={twoFactorCode}
          onChange={(event) => setTwoFactorCode(event.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          {t("emailCode.twoFactorHint")}
        </p>
      </div>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {t("emailCode.verifyButton")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={() => void requestCode()}
      >
        {t("emailCode.resend")}
      </Button>
      <Button type="button" variant="ghost" onClick={onBack}>
        {t("emailCode.back")}
      </Button>
    </form>
  );
}
