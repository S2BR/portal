"use client";

import { Fragment, type ReactNode } from "react";

import { useCurrentUser } from "@/components/auth/current-user";

/**
 * Re-mounts its subtree whenever the active account changes (the current-user id), so any
 * account-scoped, client-fetched data inside — e.g. the businesses list — re-queries on a profile
 * switch. Each component just shows its own skeleton while it reloads; there's no full page reload
 * and the header/shell stay put. Server-rendered data is refreshed separately by `router.refresh()`
 * on switch, so the two together re-query everything scoped to the account.
 *
 * One place enforces the rule "an account change re-queries everything," so a new account-scoped
 * page can't silently go stale — no per-component wiring needed.
 */
export function AccountBoundary({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  return <Fragment key={user?.id ?? "anonymous"}>{children}</Fragment>;
}
