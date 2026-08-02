"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorText } from "@/lib/api/error-text";
import { checkPassword } from "@/lib/auth/password";
import { useAppConfig } from "@/lib/config/use-app-config";

/**
 * Change the signed-in account's password. Requires the current password; the
 * new one is validated against the live policy before sending. On success the
 * api signs out every other session, so we surface that reassurance.
 */
export function PasswordSettings() {
  const t = useTranslations("passwordSettings");
  const fields = useTranslations("auth.fields");
  const authErrors = useTranslations("auth.errors");
  const config = useAppConfig();

  const [editing, setEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  function reset() {
    setEditing(false);
    setCurrentPassword("");
    setPassword("");
    setConfirm("");
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!currentPassword) {
      setError(authErrors("password"));
      return;
    }
    if (config && checkPassword(password, config.password)) {
      setError(authErrors("passwordPolicy"));
      return;
    }
    if (password !== confirm) {
      setError(authErrors("passwordMismatch"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
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
        reset();
        setDone(true);
      } else {
        setError(apiErrorText(data) ?? authErrors("generic"));
      }
    } catch {
      setError(authErrors("generic"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">{t("currentPassword")}</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("newPassword")}</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                {fields("confirmPassword")}
              </Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
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
            <span className="text-muted-foreground text-sm">
              {done ? t("success") : t("hint")}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDone(false);
                setEditing(true);
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
