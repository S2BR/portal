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
 * Passwordless sign-in with an emailed one-time code. The emailed code is verified on its own
 * field first; if the account has 2FA, the API returns a single-use pending token and we reveal
 * the authenticator-code field in its place (never both at once). The emailed code is consumed
 * exactly once server-side — the second step uses the pending token, not the code again.
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
  const [pendingToken, setPendingToken] = useState<string | null>(null);
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
      const data = (await response.json()) as { status?: string };
      if (data.status === "code_sent") {
        return true;
      }
      if (data.status === "rate_limited") {
        setError(t("errors.rateLimited"));
        return false;
      }
      setError(t("errors.generic"));
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
      setPendingToken(null);
      setStep("verify");
    }
  }

  // Step 1: verify the emailed code. A 2FA account returns a pending token — we swap the code
  // field for the authenticator field rather than showing both.
  async function submitCode() {
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
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const data = (await response.json()) as {
        status?: string;
        pending_token?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (data.status === "authenticated") {
        router.replace(nextPath);
        router.refresh();
        return;
      }
      if (data.status === "two_factor_required" && data.pending_token) {
        setPendingToken(data.pending_token);
        setTwoFactorCode("");
        setError(null);
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

  // Step 2: complete with the pending token + the authenticator code. A bad code can be retried.
  async function submitTwoFactor() {
    if (!twoFactorCode.trim()) {
      setError(t("errors.code"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login/email/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pending_token: pendingToken,
          two_factor_code: twoFactorCode.trim(),
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

  function onVerify(event: FormEvent) {
    event.preventDefault();
    void (pendingToken ? submitTwoFactor() : submitCode());
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

  const awaitingTwoFactor = pendingToken !== null;

  return (
    <form onSubmit={onVerify} className="flex flex-col gap-4">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {awaitingTwoFactor
            ? t("emailCode.twoFactorTitle")
            : t("emailCode.verifyTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {awaitingTwoFactor
            ? t("emailCode.twoFactorSubtitle")
            : t("emailCode.verifySubtitle", { email })}
        </p>
      </div>

      {awaitingTwoFactor ? (
        <div className="space-y-2">
          <Label htmlFor="email-code-2fa">
            {t("emailCode.twoFactorLabel")}
          </Label>
          <Input
            id="email-code-2fa"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={twoFactorCode}
            onChange={(event) => setTwoFactorCode(event.target.value)}
            disabled={pending}
          />
        </div>
      ) : (
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
      )}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {t("emailCode.verifyButton")}
      </Button>
      {awaitingTwoFactor ? null : (
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => void requestCode()}
        >
          {t("emailCode.resend")}
        </Button>
      )}
      <Button type="button" variant="ghost" onClick={onBack}>
        {t("emailCode.back")}
      </Button>
    </form>
  );
}
