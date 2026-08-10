"use client";

import { Cake, CalendarDays, Clock, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { Timezone } from "@/app/api/auth/timezones/route";
import { useCurrentUser } from "@/components/auth/current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { DateWheelPicker } from "@/components/ui/date-wheel-picker";
import {
  SettingBlock,
  SettingTile,
} from "@/components/ui/setting-tile";
import { defaultBirthDate } from "@/lib/date-wheel";
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

type EditableField = "name" | "timezone" | "dateOfBirth";

/**
 * The account's low-sensitivity profile fields shown as tiles — display name, date of birth, timezone
 * — plus a read-only "member since". Clicking a tile expands just that one field into an inline editor
 * (the others stay put) and saves it on its own via `PATCH /account`. Timestamps stay UTC on the api;
 * the chosen zone is what the app formats them in. An empty zone means "device default".
 */
export function ProfileSettings() {
  const t = useTranslations("profileSettings");
  const fields = useTranslations("auth.fields");
  const authErrors = useTranslations("auth.errors");
  const locale = useLocale();
  const { user, refresh } = useCurrentUser();

  const [editingField, setEditingField] = useState<EditableField | null>(null);
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

  function startEdit(field: EditableField) {
    if (!user) {
      return;
    }
    setName(user.name);
    setTimezone(user.timezone ?? "");
    // Always seed a date so the "Born …" preview and wheel have something to show.
    setDateOfBirth(user.date_of_birth ?? defaultBirthDate());
    setError(null);
    setEditingField(field);
  }

  function cancel() {
    setEditingField(null);
    setError(null);
  }

  /** Send a partial update and, on success, close the editor and refresh the user. */
  async function patchAccount(body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        status?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (data.status === "ok") {
        setEditingField(null);
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

  /** Save just the field currently being edited. */
  async function saveField() {
    if (editingField === "name") {
      const trimmed = name.trim();
      if (!trimmed) {
        setError(authErrors("name"));
        return;
      }
      await patchAccount({ name: trimmed });
    } else if (editingField === "timezone") {
      await patchAccount({ timezone: timezone === "" ? null : timezone });
    } else if (editingField === "dateOfBirth") {
      await patchAccount({ date_of_birth: dateOfBirth });
    }
  }

  const currentZoneLabel =
    timezones.find((zone) => zone.id === user.timezone)?.label ??
    user.timezone ??
    t("deviceDefault");

  const footer = (
    <div className="flex items-center gap-2 pt-1">
      <Button size="sm" onClick={saveField} disabled={pending}>
        {t("save")}
      </Button>
      <Button size="sm" variant="ghost" onClick={cancel} disabled={pending}>
        {t("cancel")}
      </Button>
      {error ? <span className="text-destructive text-sm">{error}</span> : null}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Name */}
          {editingField === "name" ? (
            <SettingBlock icon={User} label={fields("name")} className="sm:col-span-2">
              <Input
                aria-label={fields("name")}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void saveField();
                  }
                }}
                autoFocus
              />
              {footer}
            </SettingBlock>
          ) : (
            <SettingTile
              icon={User}
              label={fields("name")}
              onClick={() => startEdit("name")}
              className="sm:col-span-2"
            >
              {user.name}
            </SettingTile>
          )}

          {/* Date of birth */}
          {editingField === "dateOfBirth" ? (
            <SettingBlock
              icon={Cake}
              label={t("dateOfBirth")}
              className="sm:col-span-2"
              action={
                user.date_of_birth ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => void patchAccount({ date_of_birth: null })}
                  >
                    {t("remove")}
                  </Button>
                ) : null
              }
            >
              {dateOfBirth ? (
                <p className="text-muted-foreground text-center text-sm">
                  {t.rich("born", {
                    date: formatDate(dateOfBirth, locale),
                    b: (chunks) => (
                      <span className="text-foreground ms-1 font-semibold">
                        {chunks}
                      </span>
                    ),
                  })}
                </p>
              ) : null}
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
              {footer}
            </SettingBlock>
          ) : (
            <SettingTile
              icon={Cake}
              label={t("dateOfBirth")}
              onClick={() => startEdit("dateOfBirth")}
            >
              {user.date_of_birth ? (
                formatDate(user.date_of_birth, locale)
              ) : (
                <span className="text-muted-foreground text-sm font-normal italic">
                  {t("addDateOfBirth")}
                </span>
              )}
            </SettingTile>
          )}

          {/* Timezone */}
          {editingField === "timezone" ? (
            <SettingBlock
              icon={Clock}
              label={t("timezone")}
              className="sm:col-span-2"
            >
              <Combobox
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
              {footer}
            </SettingBlock>
          ) : (
            <SettingTile
              icon={Clock}
              label={t("timezone")}
              onClick={() => startEdit("timezone")}
            >
              {currentZoneLabel}
            </SettingTile>
          )}
        </div>

        {/* Account-creation tile — read-only. */}
        <SettingTile icon={CalendarDays} label={t("memberSince")}>
          {formatMonthYear(user.created_at, locale)}
        </SettingTile>
      </CardContent>
    </Card>
  );
}

