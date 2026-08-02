"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Delete (soft-delete) the signed-in account. Password-gated and behind an
 * explicit confirmation step. On success the api revokes every session; the BFF
 * clears the local cookies, so we send the user back to sign in.
 */
export function DeleteAccountSettings() {
  const t = useTranslations("deleteAccount");
  const fields = useTranslations("auth.fields");
  const authErrors = useTranslations("auth.errors");
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!password) {
      setError(authErrors("password"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as {
        status?: string;
        message?: string;
      };
      if (data.status === "ok") {
        router.replace("/login");
      } else {
        setError(data.message ?? authErrors("generic"));
      }
    } catch {
      setError(authErrors("generic"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {confirming ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">{fields("password")}</Label>
              <Input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" disabled={pending}>
                {t("confirm")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPassword("");
                  setError(null);
                  setConfirming(false);
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            {t("delete")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
