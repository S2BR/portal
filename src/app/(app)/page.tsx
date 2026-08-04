"use client";

import {
  Building2,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  KeyRound,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useCurrentUser } from "@/components/auth/current-user";
import { UserAvatar } from "@/components/auth/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Tone = "good" | "warn" | "neutral";

function greetingKey(hour: number): "morning" | "afternoon" | "evening" {
  if (hour < 12) {
    return "morning";
  }
  if (hour < 18) {
    return "afternoon";
  }
  return "evening";
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const format = useFormatter();
  const { user, loading } = useCurrentUser();
  const [counts, setCounts] = useState<{
    passkeys: number;
    sessions: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [passkeys, sessions] = await Promise.all([
          fetch("/api/auth/passkeys").then((response) => response.json()),
          fetch("/api/auth/sessions").then((response) => response.json()),
        ]);
        if (active) {
          setCounts({
            passkeys: passkeys.passkeys?.length ?? 0,
            sessions: sessions.sessions?.length ?? 0,
          });
        }
      } catch {
        if (active) {
          setCounts({ passkeys: 0, sessions: 0 });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading || !user) {
    return <DashboardSkeleton />;
  }

  const hour = new Date().getHours();
  const steps = [
    { key: "avatar", done: user.avatar !== null, icon: Camera },
    { key: "twoFactor", done: user.two_factor_enabled, icon: ShieldCheck },
    { key: "passkey", done: (counts?.passkeys ?? 0) > 0, icon: KeyRound },
  ];
  const done = steps.filter((step) => step.done).length;
  const allDone = counts !== null && done === steps.length;

  return (
    <div className="space-y-8">
      <section className="from-primary/12 via-card to-card relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 sm:p-8">
        <Sparkles
          aria-hidden
          className="text-primary/15 pointer-events-none absolute -top-6 -end-6 size-32"
        />
        <div className="relative flex items-center gap-4">
          <UserAvatar
            name={user.name}
            src={user.avatar}
            className="size-16"
            fallbackClassName="text-xl"
          />
          <div className="min-w-0">
            <h1 className="font-heading truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {t(`greeting.${greetingKey(hour)}`, { name: user.name })}
            </h1>
            <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
          </div>
        </div>
      </section>

      {allDone ? (
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full">
              <Check className="size-5" />
            </span>
            <div>
              <CardTitle>{t("setup.doneTitle")}</CardTitle>
              <CardDescription>{t("setup.doneSubtitle")}</CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("setup.title")}</CardTitle>
            <CardDescription>
              {t("setup.progress", { done, total: steps.length })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={(done / steps.length) * 100} />
            <ul className="space-y-1">
              {steps.map(({ key, done: stepDone, icon: Icon }) => (
                <li key={key} className="flex items-center gap-3 py-1">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      stepDone
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {stepDone ? (
                      <Check className="size-4" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "flex-1 text-sm",
                      stepDone && "text-muted-foreground line-through",
                    )}
                  >
                    {t(`setup.${key}`)}
                  </span>
                  {stepDone ? null : (
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/profile">
                        {t("setup.action")}
                        <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={ShieldCheck}
          label={t("status.twoFactor")}
          value={user.two_factor_enabled ? t("status.on") : t("status.off")}
          tone={user.two_factor_enabled ? "good" : "warn"}
        />
        <StatTile
          icon={KeyRound}
          label={t("status.passkeys")}
          value={counts ? String(counts.passkeys) : null}
        />
        <StatTile
          icon={MonitorSmartphone}
          label={t("status.sessions")}
          value={counts ? String(counts.sessions) : null}
        />
        <StatTile
          icon={CalendarDays}
          label={t("status.memberSince")}
          value={format.dateTime(new Date(user.created_at), {
            dateStyle: "medium",
          })}
        />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {t("modules.title")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t("modules.subtitle")}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ModuleCard
            icon={Building2}
            title={t("modules.business")}
            description={t("modules.businessDesc")}
            soon={t("modules.soon")}
          />
          <ModuleCard
            icon={Users}
            title={t("modules.community")}
            description={t("modules.communityDesc")}
            soon={t("modules.soon")}
          />
        </div>
      </section>
    </div>
  );
}

const TONE_STYLES: Record<Tone, string> = {
  good: "bg-primary/10 text-primary",
  warn: "bg-brand-gold/15 text-brand-gold-deep",
  neutral: "bg-muted text-muted-foreground",
};

/** A compact stat tile linking into settings; shows a skeleton until its value resolves. */
function StatTile({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
  tone?: Tone;
}) {
  return (
    <Link
      href="/profile"
      className="focus-visible:ring-ring group rounded-xl outline-none focus-visible:ring-2"
    >
      <div className="bg-card hover:border-primary/40 flex h-full items-center gap-3 rounded-xl border p-4 transition-colors">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            TONE_STYLES[tone],
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">{label}</p>
          {value === null ? (
            <Skeleton className="mt-1 h-5 w-10" />
          ) : (
            <p className="truncate text-lg font-semibold">{value}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

/** A placeholder card for an upcoming product area. */
function ModuleCard({
  icon: Icon,
  title,
  description,
  soon,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  soon: string;
}) {
  return (
    <div className="bg-card flex items-start gap-4 rounded-xl border border-dashed p-5">
      <span className="bg-muted text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{title}</h3>
          <Badge variant="gold" className="text-[10px] uppercase">
            {soon}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-28 w-full rounded-2xl sm:h-32" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[74px] w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}
