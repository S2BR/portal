"use client";

import { Check, LogOut, User, UserPlus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { useCurrentUser } from "@/components/auth/current-user";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AccountSummary {
  id: number;
  name: string;
  email: string;
}

export function UserMenu() {
  const t = useTranslations("nav");
  const { user, loading, refresh } = useCurrentUser();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [others, setOthers] = useState<AccountSummary[]>([]);

  const loadAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/accounts");
      const data = (await response.json()) as { others?: AccountSummary[] };
      setOthers(data.others ?? []);
    } catch {
      setOthers([]);
    }
  }, []);

  function onOpenChange(open: boolean) {
    if (open) {
      void loadAccounts();
    }
  }

  function switchTo(id: number) {
    startTransition(async () => {
      const response = await fetch("/api/auth/accounts/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (response.ok) {
        await refresh();
        router.refresh();
      }
      await loadAccounts();
    });
  }

  function addAccount() {
    startTransition(async () => {
      const response = await fetch("/api/auth/accounts/add", {
        method: "POST",
      });
      if (response.ok) {
        router.push("/login");
      }
    });
  }

  function signOut(scope: "current" | "all") {
    startTransition(async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        status?: string;
      };
      if (data.status === "switched") {
        await refresh();
        router.refresh();
        await loadAccounts();
      } else {
        router.replace("/login");
        router.refresh();
      }
    });
  }

  if (loading) {
    return (
      <span
        className="bg-muted h-11 w-28 animate-pulse rounded-lg"
        aria-hidden
      />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <User className="size-4" />
          <span className="max-w-32 truncate">{user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-start gap-2 font-normal">
          <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="text-foreground block truncate font-medium">
              {user.name}
            </span>
            <span className="text-muted-foreground block truncate">
              {user.email}
            </span>
          </span>
        </DropdownMenuLabel>

        {others.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            {others.map((account) => (
              <DropdownMenuItem
                key={account.id}
                disabled={pending}
                onClick={() => switchTo(account.id)}
              >
                <User className="size-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {account.name}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {account.email}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={pending} onClick={addAccount}>
          <UserPlus className="size-4" />
          {t("addAccount")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User className="size-4" />
            {t("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={pending} onClick={() => signOut("current")}>
          <LogOut className="size-4" />
          {t("signOut")}
        </DropdownMenuItem>
        {others.length > 0 ? (
          <DropdownMenuItem disabled={pending} onClick={() => signOut("all")}>
            <Users className="size-4" />
            {t("signOutAll")}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
