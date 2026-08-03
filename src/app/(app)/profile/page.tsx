"use client";

import { useFormatter, useTranslations } from "next-intl";

import { useCurrentUser } from "@/components/auth/current-user";
import { DeleteAccountSettings } from "@/components/auth/delete-account-settings";
import { EmailSettings } from "@/components/auth/email-settings";
import { PasskeySettings } from "@/components/auth/passkey-settings";
import { PasswordSettings } from "@/components/auth/password-settings";
import { ProfileSettings } from "@/components/auth/profile-settings";
import { SessionSettings } from "@/components/auth/session-settings";
import { TwoFactorSettings } from "@/components/auth/two-factor-settings";

export default function ProfilePage() {
  const { user, loading } = useCurrentUser();
  const t = useTranslations("profile");
  const format = useFormatter();

  if (loading) {
    return (
      <div
        className="bg-muted mx-auto h-48 w-full max-w-xl animate-pulse rounded-2xl"
        aria-hidden
      />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("memberSince", {
            date: format.dateTime(new Date(user.created_at), {
              dateStyle: "medium",
            }),
          })}
        </p>
      </div>
      <ProfileSettings />
      <EmailSettings />
      <PasswordSettings />
      <TwoFactorSettings />
      <PasskeySettings />
      <SessionSettings />
      <DeleteAccountSettings />
    </div>
  );
}
