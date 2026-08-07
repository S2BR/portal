"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { useCurrentUser } from "@/components/auth/current-user";
import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The right side of the shared header. Reads the app-wide current-user context (seeded once in the
 * root layout, so no fetch or skeleton on navigation): the user menu when signed in, otherwise
 * "Log in" — which also covers a stale cookie whose session turned out to be gone.
 */
export function SiteHeaderAuth() {
  const t = useTranslations("marketing");
  const { user, loading } = useCurrentUser();

  if (loading) {
    return <Skeleton className="h-11 w-28 rounded-lg" />;
  }
  if (user) {
    return <UserMenu />;
  }
  return (
    <Button asChild variant="ghost">
      <Link href="/login">{t("nav.login")}</Link>
    </Button>
  );
}
