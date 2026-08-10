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
import { useEffect, useState, type ReactNode } from "react";

import type { Timezone } from "@/app/api/auth/timezones/route";
import { useCurrentUser } from "@/components/auth/current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
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
    setDateOfBirth(user.date_of_birth ?? null);
    setError(null);
    setEditingField(field);
  }

  function cancel() {
    setEditingField(null);
    setError(null);
  }

  /** Save just the field currently being edited. */
  async function saveField() {
    let body: Record<string, unknown>;
    if (editingField === "name") {
      const trimmed = name.trim();
      if (!trimmed) {
        setError(authErrors("name"));
        return;
      }
      body = { name: trimmed };
    } else if (editingField === "timezone") {
      body = { timezone: timezone === "" ? null : timezone };
    } else if (editingField === "dateOfBirth") {
      body = { date_of_birth: dateOfBirth };
    } else {
      return;
    }

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
            <EditShell icon={User} label={fields("name")} className="sm:col-span-2">
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
            </EditShell>
          ) : (
            <InfoTile
              icon={User}
              label={fields("name")}
              onClick={() => startEdit("name")}
              className="sm:col-span-2"
            >
              {user.name}
            </InfoTile>
          )}

          {/* Date of birth */}
          {editingField === "dateOfBirth" ? (
            <EditShell
              icon={Cake}
              label={t("dateOfBirth")}
              className="sm:col-span-2"
              action={
                dateOfBirth ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDateOfBirth(null)}
                  >
                    {t("clear")}
                  </Button>
                ) : null
              }
            >
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
            </EditShell>
          ) : (
            <InfoTile
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
            </InfoTile>
          )}

          {/* Timezone */}
          {editingField === "timezone" ? (
            <EditShell
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
            </EditShell>
          ) : (
            <InfoTile
              icon={Clock}
              label={t("timezone")}
              onClick={() => startEdit("timezone")}
            >
              {currentZoneLabel}
            </InfoTile>
          )}
        </div>

        {/* Account-creation tile — read-only. */}
        <InfoTile icon={CalendarDays} label={t("memberSince")}>
          {formatMonthYear(user.created_at, locale)}
        </InfoTile>
      </CardContent>
    </Card>
  );
}

/**
 * The expanded state of a field tile: the same muted block, with an icon + label header (and an
 * optional header action), the field's control, and its save/cancel footer.
 */
function EditShell({
  icon: Icon,
  label,
  action,
  children,
  className,
}: {
  icon: LucideIcon;
  label: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted/40 ring-ring/50 space-y-3 rounded-xl p-4 ring-1",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-muted-foreground flex items-center gap-2">
          <Icon className="size-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
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
