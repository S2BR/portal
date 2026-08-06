"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import {
  CurrentUserProvider,
  useCurrentUser,
} from "@/components/auth/current-user";
import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** The right side of the shared header for a visitor who has a session cookie. */
function AuthSlot() {
  const t = useTranslations("marketing");
  const { user, loading } = useCurrentUser();

  if (loading) {
    return <Skeleton className="h-11 w-28 rounded-lg" />;
  }
  if (user) {
    return <UserMenu />;
  }
  // Stale cookie / load failed — fall back to a signed-out header.
  return (
    <Button asChild variant="ghost">
      <Link href="/login">{t("nav.login")}</Link>
    </Button>
  );
}

/**
 * Signed-in slot for the shared site header (rendered only when a session cookie is present, so
 * anonymous visitors never trigger the `/api/auth/me` fetch). Shows the user menu, or falls back
 * to "Log in" if the session turns out to be gone — never redirects away from a public page.
 */
export function SiteHeaderAuth() {
  return (
    <CurrentUserProvider redirectOnFailure={false}>
      <AuthSlot />
    </CurrentUserProvider>
  );
}
