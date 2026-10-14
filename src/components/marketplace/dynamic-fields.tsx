"use client";

import { useTranslations } from "next-intl";

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

/**
 * Renders a category's dynamic fields (the schema fetched for the chosen type) as the right input per
 * type, with the value held by the parent form. Labels/options are already localized by the API.
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

  return (
    <div className="space-y-5">
      {fields.map((field) => {
        const value = values[field.key];
        const error = errors[`attributes.${field.key}`];

        if (field.type === "boolean") {
          return (
            <div key={field.key} className="space-y-1.5">
              <label className="flex items-center gap-3">
                <Switch
                  checked={value === true}
                  onCheckedChange={(checked) => onChange(field.key, checked)}
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
                        onChange(
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
                  onChange(field.key, next === NONE ? null : next)
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
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          </Field>
        );
      })}
    </div>
  );
}
