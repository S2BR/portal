"use client";

import { CalendarDays } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";

import type { Timezone } from "@/app/api/auth/timezones/route";
import { useCurrentUser } from "@/components/auth/current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateWheelPicker } from "@/components/ui/date-wheel-picker";
import { apiErrorText } from "@/lib/api/error-text";

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
          <div className="flex items-start justify-between gap-4">
            <dl className="space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{fields("name")}</dt>
                <dd>{user.name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{t("dateOfBirth")}</dt>
                <dd>
                  {user.date_of_birth ? (
                    formatDate(user.date_of_birth, locale)
                  ) : (
                    <span className="text-muted-foreground italic">
                      {t("addDateOfBirth")}
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">{t("timezone")}</dt>
                <dd>{currentZoneLabel}</dd>
              </div>
            </dl>
            <Button variant="outline" size="sm" onClick={startEditing}>
              {t("edit")}
            </Button>
          </div>
        )}

        {/* Account-creation tile — read-only, so it shows in both view and edit modes. Mirrors the
            /portal dashboard's "Member since" stat. */}
        <div className="bg-muted/40 flex items-center gap-3 rounded-xl p-4">
          <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
            <CalendarDays className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">{t("memberSince")}</p>
            <p className="truncate text-lg font-semibold">
              {formatMonthYear(user.created_at, locale)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
