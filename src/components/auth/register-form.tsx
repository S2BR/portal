"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppConfig } from "@/lib/api/types";
import { checkPassword } from "@/lib/auth/password";

interface RegisterFormProps {
  passwordPolicy: AppConfig["password"];
  captchaRequired: boolean;
}

export function RegisterForm({
  passwordPolicy,
  captchaRequired,
}: RegisterFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("errors.name"));
      return;
    }
    if (!email.includes("@")) {
      setError(t("errors.email"));
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email,
          password,
          password_confirmation: confirm,
        }),
      });
      const data = (await response.json()) as {
        status?: string;
        message?: string;
      };

      switch (data.status) {
        case "verification_required":
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        case "registered":
          router.push("/login");
          return;
        case "rate_limited":
          setError(t("errors.rateLimited"));
          return;
        default:
          setError(data.message ?? t("errors.generic"));
      }
    } catch {
      setError(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("register.title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("register.subtitle")}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">{t("fields.name")}</Label>
        <Input
          id="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("fields.email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
      {captchaRequired ? (
        <p className="bg-muted text-muted-foreground rounded-md p-3 text-xs">
          {t("captchaRequired")}
        </p>
      ) : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={pending || captchaRequired}>
        {t("register.submit")}
      </Button>
    </form>
  );
}
