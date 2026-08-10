"use client";

import {
  Cake,
  CalendarDays,
  Clock,
  Pencil,
  User,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import type { Timezone } from "@/app/api/auth/timezones/route";
import { useCurrentUser } from "@/components/auth/current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateWheelPicker } from "@/components/ui/date-wheel-picker";
import { apiErrorText } from "@/lib/api/error-text";
import { cn } from "@/lib/utils";

/** "March 2026" — the account-creation month, in the active locale. */
function formatMonthYear(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** A `YYYY-MM-DD` date as a long localized date, parsed as local (no timezone shift). */
function formatDate(ymd: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
    new Date(`${ymd}T00:00:00`),
  );
}

/**
 * Edit the account's low-sensitivity profile fields — display name, timezone
 * preference, and date of birth — via `PATCH /account`, and show when the account
 * was created. Timestamps stay UTC on the api; the chosen zone is what the app
 * formats them in. An empty zone means "device default".
 */
export function ProfileSettings() {
  const t = useTranslations("profileSettings");
  const fields = useTranslations("auth.fields");
  const authErrors = useTranslations("auth.errors");
  const locale = useLocale();
  const { user, refresh } = useCurrentUser();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [timezones, setTimezones] = useState<Timezone[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/timezones")
      .then((response) => response.json())
      .then((data: { timezones?: Timezone[] }) => {
        if (active && data.timezones) {
          setTimezones(data.timezones);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!user) {
    return null;
  }

  function startEditing() {
    if (!user) {
      return;
    }
    setName(user.name);
    setTimezone(user.timezone ?? "");
    setDateOfBirth(user.date_of_birth ?? null);
    setError(null);
    setEditing(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(authErrors("name"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          timezone: timezone === "" ? null : timezone,
          date_of_birth: dateOfBirth,
        }),
      });
      const data = (await response.json()) as {
        status?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (data.status === "ok") {
        setEditing(false);
        await refresh();
      } else {
        setError(apiErrorText(data) ?? authErrors("generic"));
      }
    } catch {
      setError(authErrors("generic"));
    } finally {
      setPending(false);
    }
  }

  const currentZoneLabel =
    timezones.find((zone) => zone.id === user.timezone)?.label ??
    user.timezone ??
    t("deviceDefault");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing ? (
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">{fields("name")}</Label>
              <Input
                id="profile-name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-timezone">{t("timezone")}</Label>
              <Combobox
                id="profile-timezone"
                value={timezone}
                onChange={setTimezone}
                options={[
                  { value: "", label: t("deviceDefault") },
                  ...timezones.map((zone) => ({
                    value: zone.id,
                    label: zone.label,
                  })),
                ]}
                placeholder={t("deviceDefault")}
                searchPlaceholder={t("searchTimezone")}
                emptyText={t("noTimezone")}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("dateOfBirth")}</Label>
                {dateOfBirth ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateOfBirth(null)}
                  >
                    {t("clear")}
                  </Button>
                ) : null}
              </div>
              <DateWheelPicker
                value={dateOfBirth}
                onChange={setDateOfBirth}
                locale={locale}
                labels={{
                  year: t("dobYear"),
                  month: t("dobMonth"),
                  day: t("dobDay"),
                }}
              />
              <p className="text-muted-foreground text-xs">{t("dobHint")}</p>
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {t("save")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(false)}
              >
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          // Each field is a tile that opens the editor (like the /portal dashboard's stat tiles).
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoTile
              icon={User}
              label={fields("name")}
              onClick={startEditing}
              className="sm:col-span-2"
            >
              {user.name}
            </InfoTile>
            <InfoTile
              icon={Cake}
              label={t("dateOfBirth")}
              onClick={startEditing}
            >
              {user.date_of_birth ? (
                formatDate(user.date_of_birth, locale)
              ) : (
                <span className="text-muted-foreground text-sm font-normal italic">
                  {t("addDateOfBirth")}
                </span>
              )}
            </InfoTile>
            <InfoTile
              icon={Clock}
              label={t("timezone")}
              onClick={startEditing}
            >
              {currentZoneLabel}
            </InfoTile>
          </div>
        )}

        {/* Account-creation tile — read-only, so it shows in both view and edit modes. */}
        <InfoTile icon={CalendarDays} label={t("memberSince")}>
          {formatMonthYear(user.created_at, locale)}
        </InfoTile>
      </CardContent>
    </Card>
  );
}

/**
 * A muted rounded tile — an icon, a small label, and a value — matching the /portal dashboard's stat
 * tiles. With `onClick` it becomes a button (hover highlight + a pencil affordance); without it, a
 * plain read-only block.
 */
function InfoTile({
  icon: Icon,
  label,
  children,
  onClick,
  className,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const body = (
    <>
      <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <div className="truncate text-base font-semibold">{children}</div>
      </div>
      {onClick ? (
        <Pencil
          aria-hidden
          className="text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        />
      ) : null}
    </>
  );

  if (!onClick) {
    return (
      <div
        className={cn(
          "bg-muted/40 flex items-center gap-3 rounded-xl p-4",
          className,
        )}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group bg-muted/40 hover:bg-muted/70 focus-visible:ring-ring flex items-center gap-3 rounded-xl p-4 text-start transition-colors outline-none focus-visible:ring-2",
        className,
      )}
    >
      {body}
    </button>
  );
}
