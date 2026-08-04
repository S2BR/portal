"use client";

import { useFormatter, useTranslations } from "next-intl";

import { AvatarSettings } from "@/components/auth/avatar-settings";
import { useCurrentUser } from "@/components/auth/current-user";
import { DeleteAccountSettings } from "@/components/auth/delete-account-settings";
import { EmailSettings } from "@/components/auth/email-settings";
import { PasskeySettings } from "@/components/auth/passkey-settings";
import { PasswordSettings } from "@/components/auth/password-settings";
import { ProfileSettings } from "@/components/auth/profile-settings";
import { SessionSettings } from "@/components/auth/session-settings";
import { TwoFactorSettings } from "@/components/auth/two-factor-settings";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { user, loading } = useCurrentUser();
  const t = useTranslations("profile");
  const format = useFormatter();

  if (loading) {
    return (
      <div className="mx-auto max-w-xl space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-xl" />
        ))}
      </div>
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
      <AvatarSettings />
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
