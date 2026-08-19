"use client";

import {
  Cake,
  CalendarDays,
  Clock,
  Languages,
  Ruler,
  User,
  VenusAndMars,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Timezone } from "@/app/api/auth/timezones/route";
import { useCurrentUser } from "@/components/auth/current-user";
import type { Gender } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { DateWheelPicker } from "@/components/ui/date-wheel-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SettingBlock,
  SettingGroup,
  SettingTile,
} from "@/components/ui/setting-tile";
import { defaultBirthDate } from "@/lib/date-wheel";
import { apiErrorText } from "@/lib/api/error-text";
import { LanguageCards } from "@/components/auth/language-cards";
import { setLocale } from "@/i18n/actions";
import { localeNames, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/** A `YYYY-MM-DD` date as a long localized date, parsed as local (no timezone shift). */
function formatDate(ymd: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
    new Date(`${ymd}T00:00:00`),
  );
}

type EditableField =
  "name" | "timezone" | "dateOfBirth" | "gender" | "distanceUnit" | "language";

/** The selectable gender values, matching the api's Gender enum. Labels come from i18n. */
const GENDER_OPTIONS: Gender[] = [
  "male",
  "female",
  "non_binary",
  "prefer_not_to_say",
];

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
  const format = useFormatter();
  const { user, refresh } = useCurrentUser();
  const router = useRouter();

  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | "">("");
  const [distanceUnit, setDistanceUnit] = useState<"km" | "mi">("km");
  const [language, setLanguage] = useState<Locale>(locale as Locale);
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
    setGender(user.gender ?? "");
    setDistanceUnit(user.distance_unit === "mi" ? "mi" : "km");
    setLanguage((user.locale as Locale) ?? (locale as Locale));
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
        // The signed-in user's timezone feeds next-intl's date formatting (a server config), so a
        // change only takes effect after the RSC tree re-runs — refresh it rather than wait for a reload.
        router.refresh();
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
    } else if (editingField === "gender") {
      await patchAccount({ gender: gender === "" ? null : gender });
    } else if (editingField === "distanceUnit") {
      await patchAccount({ distance_unit: distanceUnit });
    } else if (editingField === "language") {
      // Set the locale cookie first so the RSC re-render (in patchAccount) picks up the new language.
      await setLocale(language);
      await patchAccount({ locale: language });
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
    <SettingGroup title={t("title")} description={t("subtitle")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Name */}
        {editingField === "name" ? (
          <SettingBlock
            icon={User}
            label={fields("name")}
            className="sm:col-span-2"
          >
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

        {/* Gender */}
        {editingField === "gender" ? (
          <SettingBlock
            icon={VenusAndMars}
            label={t("gender")}
            className="sm:col-span-2"
            action={
              user.gender ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => void patchAccount({ gender: null })}
                >
                  {t("remove")}
                </Button>
              ) : null
            }
          >
            <Select
              value={gender === "" ? undefined : gender}
              onValueChange={(value) => setGender(value as Gender)}
            >
              <SelectTrigger aria-label={t("gender")}>
                <SelectValue placeholder={t("selectGender")} />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`genders.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">{t("genderHint")}</p>
            {footer}
          </SettingBlock>
        ) : (
          <SettingTile
            icon={VenusAndMars}
            label={t("gender")}
            onClick={() => startEdit("gender")}
          >
            {user.gender ? (
              t(`genders.${user.gender}`)
            ) : (
              <span className="text-muted-foreground text-sm font-normal italic">
                {t("addGender")}
              </span>
            )}
          </SettingTile>
        )}

        {/* Distance unit */}
        {editingField === "distanceUnit" ? (
          <SettingBlock
            icon={Ruler}
            label={t("distanceUnit")}
            className="sm:col-span-2"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {(["km", "mi"] as const).map((option) => {
                const selected = distanceUnit === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDistanceUnit(option)}
                    aria-pressed={selected}
                    className={cn(
                      // Borderless three-step gray, matching the business-type cards: default →
                      // hover → selected, the selection marked by the brand-green dot.
                      "focus-visible:ring-ring flex items-center gap-2 rounded-xl p-4 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset",
                      selected
                        ? "bg-muted-foreground/10"
                        : "bg-muted/40 hover:bg-muted/70",
                    )}
                  >
                    <span className="font-medium">
                      {t(`distanceUnits.${option}`)}
                    </span>
                    {selected ? (
                      <span
                        className="bg-brand-green size-2 shrink-0 rounded-full"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("distanceUnitHint")}
            </p>
            {footer}
          </SettingBlock>
        ) : (
          <SettingTile
            icon={Ruler}
            label={t("distanceUnit")}
            onClick={() => startEdit("distanceUnit")}
          >
            {t(`distanceUnits.${user.distance_unit === "mi" ? "mi" : "km"}`)}
          </SettingTile>
        )}

        {/* Language */}
        {editingField === "language" ? (
          <SettingBlock
            icon={Languages}
            label={t("language")}
            className="sm:col-span-2"
          >
            <LanguageCards value={language} onSelect={setLanguage} />
            <p className="text-muted-foreground text-xs">{t("languageHint")}</p>
            {footer}
          </SettingBlock>
        ) : (
          <SettingTile
            icon={Languages}
            label={t("language")}
            onClick={() => startEdit("language")}
          >
            {localeNames[(user.locale as Locale) ?? (locale as Locale)]}
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

        {/* Account-creation tile — read-only. Sits beside the timezone tile so it
              doesn't hang alone on its own row. */}
        <SettingTile icon={CalendarDays} label={t("memberSince")}>
          {format.dateTime(new Date(user.created_at), {
            month: "long",
            year: "numeric",
          })}
        </SettingTile>
      </div>
    </SettingGroup>
  );
}
