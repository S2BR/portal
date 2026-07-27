"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Captcha, useCaptcha } from "@/components/auth/captcha";
import { OtpInput } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOtpLength } from "@/lib/config/use-app-config";

type Step = "credentials" | "login_otp_required" | "two_factor_required";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const {
    challenge,
    token: captchaToken,
    setToken: setCaptchaToken,
    refresh: refreshCaptcha,
  } = useCaptcha("login");
  const otpLength = useOtpLength();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
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
      };

      switch (data.status) {
        case "authenticated":
          router.replace(nextPath);
          router.refresh();
          break;
        case "login_otp_required":
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
          setError(data.message ?? t("errors.generic"));
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
    const field =
      step === "login_otp_required" ? "login_otp" : "two_factor_code";
    void submit({ email, password, [field]: codeValue.trim() });
  }

  function onSubmitCode(event: FormEvent) {
    event.preventDefault();
    submitCode(code);
  }

  if (step !== "credentials") {
    const isOtp = step === "login_otp_required";
    return (
      <form onSubmit={onSubmitCode} className="flex flex-col gap-4">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            {isOtp ? t("login.otpTitle") : t("login.twoFactorTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isOtp
              ? t("login.otpSubtitle", { email })
              : t("login.twoFactorSubtitle")}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">{t("fields.code")}</Label>
          {isOtp ? (
            <OtpInput
              id="code"
              length={otpLength}
              value={code}
              onChange={setCode}
              onComplete={submitCode}
              autoFocus
              disabled={pending}
            />
          ) : (
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoFocus
            />
          )}
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
        <h1 className="text-xl font-semibold tracking-tight">
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
        <Input
          id="password"
          type="password"
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
    </form>
  );
}
