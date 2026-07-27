"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VerifyEmailForm({ email }: { email: string }) {
  const t = useTranslations("auth");
  const router = useRouter();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      setError(t("errors.code"));
      return;
    }
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const data = (await response.json()) as { status?: string };
      if (data.status === "authenticated") {
        router.replace("/");
        router.refresh();
        return;
      }
      setError(t("verify.expired"));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setError(null);
    setInfo(null);
    await fetch("/api/auth/verify-email/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setInfo(t("verify.resent"));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("verify.title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("verify.subtitle", { email })}
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
      {info ? <p className="text-muted-foreground text-sm">{info}</p> : null}
      <Button type="submit" disabled={pending}>
        {t("verify.submit")}
      </Button>
      <Button type="button" variant="ghost" onClick={resend}>
        {t("verify.resend")}
      </Button>
    </form>
  );
}
