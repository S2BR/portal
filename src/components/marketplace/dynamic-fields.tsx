"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  AdAttributes,
  AttributeField,
  AttributeOption,
} from "@/lib/marketplace/types";
import { cn } from "@/lib/utils";

type FieldValue = string | number | boolean | string[] | null;

/** The sentinel option that clears an optional select (Radix Select forbids an empty value). */
const NONE = "__none__";

/** The BFF endpoint a reference-backed field fetches its choices from. */
const REFERENCE_ENDPOINT: Record<string, string> = {
  vehicle_year: "/api/marketplace/vehicle-years",
  vehicle_make: "/api/marketplace/vehicle-makes",
  vehicle_model: "/api/marketplace/vehicle-models",
};

/**
 * Renders a category's dynamic fields (the schema fetched for the chosen type) as the right input per
 * type, with the value held by the parent form. Labels/options are already localized by the API.
 * Reference-backed fields (e.g. vehicle make/model) fetch their choices and cascade on their
 * dependencies; changing a field clears any field that depends on it.
 */
export function DynamicFields({
  fields,
  values,
  errors,
  onChange,
}: {
  fields: AttributeField[];
  values: AdAttributes;
  errors: Record<string, string | undefined>;
  onChange: (key: string, value: FieldValue) => void;
}) {
  const t = useTranslations("marketplace");

  const labelOf = (field: AttributeField) =>
    field.unit ? `${field.label} (${field.unit})` : field.label;

  // Changing a field also clears any field that depends on it (so a stale model can't survive a make
  // change).
  function change(key: string, value: FieldValue) {
    onChange(key, value);
    for (const field of fields) {
      if (field.key !== key && (field.depends_on ?? []).includes(key)) {
        onChange(field.key, null);
      }
    }
  }

  const hasVehicleReference = fields.some((field) =>
    field.source?.startsWith("vehicle_"),
  );

  return (
    <div className="space-y-5">
      {hasVehicleReference ? (
        <VinAutofill
          fieldKeys={new Set(fields.map((field) => field.key))}
          onChange={onChange}
        />
      ) : null}

      {fields.map((field) => {
        const value = values[field.key];
        const error = errors[`attributes.${field.key}`];

        if (field.source) {
          return (
            <ReferenceSelect
              key={field.key}
              field={field}
              label={labelOf(field)}
              value={value ?? null}
              error={error}
              values={values}
              onChange={change}
            />
          );
        }

        if (field.type === "boolean") {
          return (
            <div key={field.key} className="space-y-1.5">
              <label className="flex items-center gap-3">
                <Switch
                  checked={value === true}
                  onCheckedChange={(checked) => change(field.key, checked)}
                />
                <span className="text-sm font-medium">{field.label}</span>
              </label>
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : null}
            </div>
          );
        }

        if (field.type === "multiselect") {
          const selected = Array.isArray(value) ? value : [];
          return (
            <Field key={field.key} label={labelOf(field)} error={error}>
              <div className="flex flex-wrap gap-2">
                {(field.options ?? []).map((option) => {
                  const on = selected.includes(option.value);
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={on ? "secondary" : "outline"}
                      size="sm"
                      aria-pressed={on}
                      onClick={() =>
                        change(
                          field.key,
                          on
                            ? selected.filter((v) => v !== option.value)
                            : [...selected, option.value],
                        )
                      }
                      className={cn(on && "ring-primary ring-1")}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </Field>
          );
        }

        if (field.type === "select") {
          const options: AttributeOption[] = field.options ?? [];
          return (
            <Field key={field.key} label={labelOf(field)} error={error}>
              <Select
                value={typeof value === "string" && value ? value : NONE}
                onValueChange={(next) =>
                  change(field.key, next === NONE ? null : next)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("form.selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {!field.required ? (
                    <SelectItem value={NONE}>{t("form.selectNone")}</SelectItem>
                  ) : null}
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          );
        }

        // text, number, date
        return (
          <Field key={field.key} label={labelOf(field)} error={error}>
            <Input
              type={
                field.type === "number"
                  ? "number"
                  : field.type === "date"
                    ? "date"
                    : "text"
              }
              value={value === null || value === undefined ? "" : String(value)}
              required={field.required}
              onChange={(event) => change(field.key, event.target.value)}
            />
          </Field>
        );
      })}
    </div>
  );
}

/** VIN shortcut: decode a VIN and auto-fill the vehicle fields (year/make/model/body/fuel/transmission). */
function VinAutofill({
  fieldKeys,
  onChange,
}: {
  fieldKeys: Set<string>;
  onChange: (key: string, value: FieldValue) => void;
}) {
  const t = useTranslations("marketplace");
  const [open, setOpen] = useState(false);
  const [vin, setVin] = useState("");
  const [busy, setBusy] = useState(false);

  async function decode() {
    const clean = vin.trim().toUpperCase();
    if (!/^[A-HJ-NPR-Z0-9]{11,17}$/.test(clean)) {
      toast.error(t("form.vinInvalid"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/marketplace/vehicle-vin?vin=${encodeURIComponent(clean)}`,
      );
      if (!res.ok) {
        toast.error(t("form.vinInvalid"));
        return;
      }
      const data = (await res.json()) as { data?: Record<string, string> };
      const applied = Object.entries(data.data ?? {}).filter(([key]) =>
        fieldKeys.has(key),
      );
      if (applied.length === 0) {
        toast.error(t("form.vinNotFound"));
        return;
      }
      for (const [key, value] of applied) {
        onChange(key, value);
      }
      toast.success(t("form.vinFilled"));
      setOpen(false);
      setVin("");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto p-0"
        onClick={() => setOpen(true)}
      >
        {t("form.vinPrompt")}
      </Button>
    );
  }

  return (
    <div className="bg-muted/40 flex flex-wrap items-end gap-2 rounded-xl p-3">
      <div className="min-w-0 flex-1 sm:max-w-xs">
        <Field label={t("form.vin")} hint={t("form.vinHint")}>
          <Input
            value={vin}
            onChange={(event) => setVin(event.target.value)}
            placeholder={t("form.vinPlaceholder")}
            maxLength={17}
            className="font-mono uppercase"
          />
        </Field>
      </div>
      <Button type="button" onClick={() => void decode()} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        {t("form.vinFill")}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
        {t("form.vinCancel")}
      </Button>
    </div>
  );
}

/** A reference-backed select: fetches its choices from the source, cascading on `depends_on` values. */
function ReferenceSelect({
  field,
  label,
  value,
  error,
  values,
  onChange,
}: {
  field: AttributeField;
  label: string;
  value: FieldValue;
  error?: string;
  values: AdAttributes;
  onChange: (key: string, value: FieldValue) => void;
}) {
  const t = useTranslations("marketplace");
  const [options, setOptions] = useState<AttributeOption[]>([]);

  const endpoint = field.source ? REFERENCE_ENDPOINT[field.source] : undefined;
  const deps = field.depends_on ?? [];
  const depsReady = deps.every((key) => {
    const dep = values[key];
    return dep !== null && dep !== undefined && dep !== "";
  });
  // A stable key that changes whenever a dependency's value changes, to re-fetch.
  const depKey = deps.map((key) => String(values[key] ?? "")).join("|");

  useEffect(() => {
    if (!endpoint || (deps.length > 0 && !depsReady)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOptions([]);
      return;
    }
    const params = new URLSearchParams();
    for (const key of deps) {
      const dep = values[key];
      if (dep !== null && dep !== undefined && dep !== "") {
        params.set(key, String(dep));
      }
    }
    const query = params.toString();
    let cancelled = false;
    void fetch(`${endpoint}${query ? `?${query}` : ""}`)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((data: { data?: AttributeOption[] }) => {
        if (!cancelled) {
          setOptions(data.data ?? []);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, depKey, depsReady]);

  const disabled = deps.length > 0 && !depsReady;
  const current =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value
        : "";

  // Always render an item for the current value — even before the (lazy, cascading) options arrive —
  // so a value set programmatically (e.g. from a VIN) is selectable immediately.
  const items =
    current !== "" && !options.some((option) => option.value === current)
      ? [{ value: current, label: current }, ...options]
      : options;
  // Render the trigger label ourselves: Radix can't resolve a value whose option hasn't loaded yet
  // (the model's options lazy-load for the chosen make+year), which otherwise shows an empty trigger.
  const currentLabel =
    items.find((option) => option.value === current)?.label ?? current;

  return (
    <Field
      label={label}
      hint={disabled ? t("form.referenceLocked") : undefined}
      error={error}
    >
      <Select
        value={current !== "" ? current : NONE}
        disabled={disabled}
        onValueChange={(next) => {
          // Radix fires onValueChange("") spuriously when the controlled value's option hasn't
          // mounted yet (the model's options lazy-load for the make+year), which would wipe a
          // just-set value (e.g. from a VIN). A real clear uses the NONE sentinel, never "".
          if (!next) {
            return;
          }
          onChange(field.key, next === NONE ? null : next);
        }}
      >
        <SelectTrigger>
          <span
            className={cn(
              "truncate",
              current === "" && "text-muted-foreground",
            )}
          >
            {current !== "" ? currentLabel : t("form.selectPlaceholder")}
          </span>
        </SelectTrigger>
        <SelectContent>
          {!field.required ? (
            <SelectItem value={NONE}>{t("form.selectNone")}</SelectItem>
          ) : null}
          {items.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
