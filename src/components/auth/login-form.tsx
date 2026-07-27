"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "credentials" | "login_otp_required" | "two_factor_required";

interface LoginFormProps {
  captchaRequired: boolean;
  nextPath: string;
}

export function LoginForm({ captchaRequired, nextPath }: LoginFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(payload: Record<string, string>) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { status?: string };

      switch (data.status) {
        case "authenticated":
          router.replace(nextPath);
          router.refresh();
          return;
        case "login_otp_required":
        case "two_factor_required":
          setStep(data.status);
          setCode("");
          return;
        case "email_unverified":
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        case "rate_limited":
          setError(t("errors.rateLimited"));
          return;
        default:
          setError(t("errors.invalidCredentials"));
      }
    } catch {
      setError(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  function onSubmitCredentials(event: FormEvent) {
    event.preventDefault();
    if (!email.includes("@")) {
      setError(t("errors.email"));
      return;
    }
    if (!password) {
      setError(t("errors.password"));
      return;
    }
    void submit({ email, password });
  }

  function onSubmitCode(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      setError(t("errors.code"));
      return;
    }
    const field =
      step === "login_otp_required" ? "login_otp" : "two_factor_code";
    void submit({ email, password, [field]: code.trim() });
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
            setError(null);
          }}
        >
          {t("login.back")}
        </Button>
      </form>
    );
  }

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
      {captchaRequired ? (
        <p className="bg-muted text-muted-foreground rounded-md p-3 text-xs">
          {t("captchaRequired")}
        </p>
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={pending || captchaRequired}>
        {t("login.submit")}
      </Button>
    </form>
  );
}
