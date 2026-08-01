"use client";

import { useFormatter, useTranslations } from "next-intl";

import { useCurrentUser } from "@/components/auth/current-user";
import { EmailSettings } from "@/components/auth/email-settings";
import { PasskeySettings } from "@/components/auth/passkey-settings";
import { TwoFactorSettings } from "@/components/auth/two-factor-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const { user, loading } = useCurrentUser();
  const t = useTranslations("profile");
  const format = useFormatter();

  if (loading) {
    return (
      <div
        className="bg-muted h-48 w-full max-w-lg animate-pulse rounded-xl"
        aria-hidden
      />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">{user.email}</p>
          <p className="text-muted-foreground">
            {t("memberSince", {
              date: format.dateTime(new Date(user.created_at), {
                dateStyle: "medium",
              }),
            })}
          </p>
        </CardContent>
      </Card>
      <EmailSettings />
      <TwoFactorSettings />
      <PasskeySettings />
    </div>
  );
}
