"use client";

import { useRouter } from "next/navigation";

import { enterApp } from "@/lib/auth/enter-app";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Captcha, useCaptcha } from "@/components/auth/captcha";
import { EmailCodeSignIn } from "@/components/auth/email-code-sign-in";
import { PasskeySignInButton } from "@/components/auth/passkey-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { apiErrorText } from "@/lib/api/error-text";

type Step = "credentials" | "two_factor_required";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const {
    challenge,
    token: captchaToken,
    setToken: setCaptchaToken,
    refresh: refreshCaptcha,
  } = useCaptcha("login");

  const [method, setMethod] = useState<"password" | "email_code">("password");
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  // Set when a passkey sign-in hits a 2FA account: the second step completes with this single-use
  // token + the authenticator code (not by re-submitting credentials, like the password flow does).
  const [passkeyPendingToken, setPasskeyPendingToken] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(payload: Record<string, string>): Promise<string> {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        status?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };

      switch (data.status) {
        case "authenticated":
          enterApp(nextPath);
          break;
        case "two_factor_required":
          setStep(data.status);
          setCode("");
          break;
        case "email_unverified":
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          break;
        case "rate_limited":
          setError(t("errors.rateLimited"));
          break;
        default:
          // captcha_failed, invalid_code, and bad credentials all carry the
          // portal's own (localized) message.
          setError(apiErrorText(data) ?? t("errors.generic"));
      }
      return data.status ?? "invalid";
    } catch {
      setError(t("errors.generic"));
      return "error";
    } finally {
      setPending(false);
    }
  }

  async function onSubmitCredentials(event: FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      setError(t("errors.email"));
      return;
    }
    if (!password) {
      setError(t("errors.password"));
      return;
    }
    const status = await submit({
      email,
      password,
      ...(challenge?.required && captchaToken
        ? { captcha_token: captchaToken }
        : {}),
    });
    // Challenges are single-use; a failed attempt burns it, so issue a fresh one.
    if (
      status === "invalid" ||
      status === "captcha_failed" ||
      status === "rate_limited" ||
      status === "error"
    ) {
      void refreshCaptcha();
    }
  }

  function submitCode(codeValue: string) {
    if (!codeValue.trim()) {
      setError(t("errors.code"));
      return;
    }
    void submit({ email, password, two_factor_code: codeValue.trim() });
  }

  // Complete a passkey sign-in's 2FA step: exchange the pending token + authenticator code for a
  // session via the shared completion endpoint. A bad code can be retried until the token burns.
  async function completePasskeyTwoFactor(codeValue: string) {
    if (!codeValue.trim()) {
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
          pending_token: passkeyPendingToken,
          two_factor_code: codeValue.trim(),
        }),
      });
      const data = (await response.json()) as {
        status?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (data.status === "authenticated") {
        enterApp(nextPath);
      } else if (data.status === "rate_limited") {
        setError(t("errors.rateLimited"));
      } else {
        setError(apiErrorText(data) ?? t("errors.code"));
      }
    } catch {
      setError(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  function onSubmitCode(event: FormEvent) {
    event.preventDefault();
    if (passkeyPendingToken) {
      void completePasskeyTwoFactor(code);
    } else {
      submitCode(code);
    }
  }

  if (method === "email_code") {
    return (
      <EmailCodeSignIn
        nextPath={nextPath}
        initialEmail={email}
        onBack={() => {
          setError(null);
          setMethod("password");
        }}
      />
    );
  }

  if (step !== "credentials" || passkeyPendingToken) {
    return (
      <form onSubmit={onSubmitCode} className="flex flex-col gap-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("login.twoFactorTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("login.twoFactorSubtitle")}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">{t("fields.code")}</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoFocus
          />
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {t("login.otpSubmit")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setStep("credentials");
            setPasskeyPendingToken(null);
            setError(null);
          }}
        >
          {t("login.back")}
        </Button>
      </form>
    );
  }

  const captchaBlocking = Boolean(challenge?.required) && !captchaToken;

  return (
    <form onSubmit={onSubmitCredentials} className="flex flex-col gap-4">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("signIn.title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("signIn.subtitle")}</p>
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
      <div className="space-y-2">
        <Label htmlFor="password">{t("fields.password")}</Label>
        <PasswordInput
          id="password"

          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <Captcha challenge={challenge} onToken={setCaptchaToken} />
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={pending || captchaBlocking}>
        {t("login.submit")}
      </Button>
      <PasskeySignInButton
        nextPath={nextPath}
        disabled={pending}
        onTwoFactorRequired={(token) => {
          setCode("");
          setError(null);
          setPasskeyPendingToken(token);
        }}
      />
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          setError(null);
          setMethod("email_code");
        }}
      >
        {t("emailCode.button")}
      </Button>
    </form>
  );
}
