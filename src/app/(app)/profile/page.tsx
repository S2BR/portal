"use client";

import { useFormatter, useTranslations } from "next-intl";

import { useCurrentUser } from "@/components/auth/current-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{t("email")}</span>
            <span className="truncate">{user.email}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge active={user.email_verified}>
              {user.email_verified ? t("emailVerified") : t("emailNotVerified")}
            </Badge>
            <Badge active={user.two_factor_enabled}>
              {user.two_factor_enabled ? t("twoFactorOn") : t("twoFactorOff")}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {t("memberSince", {
              date: format.dateTime(new Date(user.created_at), {
                dateStyle: "medium",
              }),
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Badge({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        active
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
