"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";

import { Captcha, useCaptcha } from "@/components/auth/captcha";
import { enterApp } from "@/lib/auth/enter-app";
import { OtpInput } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorText } from "@/lib/api/error-text";
import { useOtpLength } from "@/lib/config/use-app-config";

type Step = "request" | "verify" | "linkSent";

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
  const otpLength = useOtpLength();
  const {
    challenge,
    token: captchaToken,
    setToken: setCaptchaToken,
    refresh: refreshCaptcha,
  } = useCaptcha("email_login");

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Tick the resend cooldown down to zero (one timeout re-armed each second).
  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestCode(
    delivery: "code" | "link" = "code",
  ): Promise<boolean> {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          ...(delivery === "link" ? { delivery: "link" } : {}),
          ...(challenge?.required && captchaToken
            ? { captcha_token: captchaToken }
            : {}),
        }),
      });
      const data = (await response.json()) as {
        status?: string;
        retry_after?: number | null;
        message?: string;
      };
      if (data.status === "code_sent") {
        // Drive the resend countdown from the server's cooldown, so a too-soon resend is
        // shown as a wait rather than silently doing nothing.
        if (typeof data.retry_after === "number" && data.retry_after > 0) {
          setCooldown(data.retry_after);
        }
        return true;
      }
      if (data.status === "rate_limited") {
        setError(t("errors.rateLimited"));
      } else {
        // captcha_failed carries the API's own (localized) message.
        setError(apiErrorText(data) ?? t("errors.generic"));
      }
      // Challenges are single-use; a failed attempt burns it, so issue a fresh one.
      void refreshCaptcha();
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
    if (await requestCode("code")) {
      setCode("");
      setTwoFactorCode("");
      setPendingToken(null);
      setStep("verify");
    }
  }

  // Email a magic sign-in link instead of a typed code; it lands on /magic-link.
  async function onRequestLink() {
    if (!email.includes("@")) {
      setError(t("errors.email"));
      return;
    }
    if (await requestCode("link")) {
      setStep("linkSent");
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
        enterApp(nextPath);
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
        enterApp(nextPath);
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

  // A resend hits the same captcha-gated endpoint, but there's no widget on the code screen —
  // so when a captcha is required, send the user back to the request step to solve a fresh one.
  function onResend() {
    if (challenge?.required) {
      void refreshCaptcha();
      setCode("");
      setStep("request");
      return;
    }
    void requestCode("code");
  }

  // With the captcha gate on, the send buttons wait for a solved challenge.
  const captchaBlocking = Boolean(challenge?.required) && !captchaToken;

  if (step === "request") {
    return (
      <form onSubmit={onRequest} className="flex flex-col gap-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
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
        <Captcha challenge={challenge} onToken={setCaptchaToken} />
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button type="submit" disabled={pending || captchaBlocking}>
          {t("emailCode.sendButton")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || captchaBlocking}
          onClick={() => void onRequestLink()}
        >
          {t("emailCode.sendLinkButton")}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          {t("emailCode.back")}
        </Button>
      </form>
    );
  }

  if (step === "linkSent") {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("emailCode.linkSentTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("emailCode.linkSentSubtitle", { email })}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep("request")}
        >
          {t("emailCode.back")}
        </Button>
      </div>
    );
  }

  const awaitingTwoFactor = pendingToken !== null;

  return (
    <form onSubmit={onVerify} className="flex flex-col gap-4">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
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
          disabled={pending || cooldown > 0}
          onClick={onResend}
        >
          {cooldown > 0
            ? t("emailCode.resendIn", { seconds: cooldown })
            : t("emailCode.resend")}
        </Button>
      )}
      <Button type="button" variant="ghost" onClick={onBack}>
        {t("emailCode.back")}
      </Button>
    </form>
  );
}
