"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { apiErrorText } from "@/lib/api/error-text";
import {
  ATTRIBUTE_TYPES,
  localeText,
  readText,
  typeHasOptions,
  type AdminCategory,
  type AdminField,
  type AttributeType,
} from "@/lib/marketplace/admin";

interface OptionDraft {
  value: string;
  label: string;
}

interface FieldForm {
  label: string;
  type: AttributeType;
  unit: string;
  required: boolean;
  filterable: boolean;
  options: OptionDraft[];
}

const EMPTY_FIELD: FieldForm = {
  label: "",
  type: "text",
  unit: "",
  required: false,
  filterable: false,
  options: [],
};

/** Manage one category's field definitions: list, add, edit, and remove (deprecate). */
export function CategoryFieldsEditor({
  category,
  onChanged,
}: {
  category: AdminCategory;
  onChanged: () => void;
}) {
  const t = useTranslations("admin.marketplace");
  const [fields, setFields] = useState<AdminField[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/marketplace/categories/${category.id}/attributes`,
      );
      const data = (await res.json()) as { fields?: AdminField[] };
      setFields(data.fields ?? []);
    } finally {
      setLoading(false);
    }
  }, [category.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function refresh() {
    void load();
    onChanged();
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {t("fields.heading", { type: readText(category.name) })}
        </h2>
        <p className="text-muted-foreground text-sm">{t("fields.subtitle")}</p>
      </header>

      {creating ? (
        <div className="rounded-xl border p-4">
          <FieldFormView
            categoryId={category.id}
            onSaved={() => {
              setCreating(false);
              refresh();
            }}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          {t("fields.new")}
        </Button>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : fields.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("fields.empty")}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {fields.map((field) => (
            <FieldRow key={field.id} field={field} onChanged={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FieldRow({
  field,
  onChanged,
}: {
  field: AdminField;
  onChanged: () => void;
}) {
  const t = useTranslations("admin.marketplace");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(t("fields.deprecateConfirm"))) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/marketplace/attributes/${field.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error(t("error"));
        return;
      }
      toast.success(t("fields.removed"));
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <li className="p-3">
        <FieldFormView
          field={field}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">
            {readText(field.label)}
          </span>
          <Badge variant="outline">{t(`type.${field.type}`)}</Badge>
          {field.required ? (
            <Badge variant="neutral">{t("fields.required")}</Badge>
          ) : null}
          {field.filterable ? (
            <Badge variant="neutral">{t("fields.filterable")}</Badge>
          ) : null}
          {!field.is_live ? (
            <Badge variant="red">{t("fields.deprecated")}</Badge>
          ) : null}
        </div>
        <div className="text-muted-foreground mt-0.5 text-xs">
          {field.key}
          {field.unit ? ` · ${field.unit}` : ""}
          {typeHasOptions(field.type)
            ? ` · ${t("fields.optionCount", { count: field.options.length })}`
            : ""}
        </div>
      </div>
      {field.is_live ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing(true)}
            aria-label={t("fields.edit")}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void remove()}
            disabled={busy}
            aria-label={t("fields.deprecate")}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : null}
    </li>
  );
}

/** Shared create/update form for a field. `field` present ⇒ edit (PUT), else create (POST). */
function FieldFormView({
  categoryId,
  field,
  onSaved,
  onCancel,
}: {
  categoryId?: number;
  field?: AdminField;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("admin.marketplace");
  const editing = field !== undefined;
  const [form, setForm] = useState<FieldForm>(
    field
      ? {
          label: readText(field.label),
          type: field.type,
          unit: field.unit ?? "",
          required: field.required,
          filterable: field.filterable,
          options: field.options.map((option) => ({
            value: option.value,
            label: readText(option.label),
          })),
        }
      : EMPTY_FIELD,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const showOptions = typeHasOptions(form.type);
  const showUnit = form.type === "number";

  async function save() {
    setError(null);
    setPending(true);
    try {
      const body = {
        label: localeText(form.label.trim()),
        type: form.type,
        unit: showUnit ? form.unit.trim() || null : null,
        required: form.required,
        filterable: form.filterable,
        ...(showOptions
          ? {
              options: form.options
                .filter((option) => option.value.trim() !== "")
                .map((option) => ({
                  value: option.value.trim(),
                  label: localeText(option.label.trim() || option.value.trim()),
                })),
            }
          : {}),
      };
      const res = await fetch(
        editing
          ? `/api/admin/marketplace/attributes/${field.id}`
          : `/api/admin/marketplace/categories/${categoryId}/attributes`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (res.ok) {
        toast.success(editing ? t("fields.saved") : t("fields.created"));
        onSaved();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      setError(apiErrorText(data) ?? t("error"));
    } finally {
      setPending(false);
    }
  }

  function setOption(index: number, patch: Partial<OptionDraft>) {
    setForm((f) => ({
      ...f,
      options: f.options.map((option, i) =>
        i === index ? { ...option, ...patch } : option,
      ),
    }));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fields.label")}>
          <Input
            value={form.label}
            onChange={(event) =>
              setForm((f) => ({ ...f, label: event.target.value }))
            }
            placeholder={t("fields.labelPlaceholder")}
            autoFocus
          />
        </Field>
        <Field label={t("fields.type")}>
          <Select
            value={form.type}
            onValueChange={(value) =>
              setForm((f) => ({ ...f, type: value as AttributeType }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ATTRIBUTE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`type.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {showUnit ? (
        <Field label={t("fields.unit")}>
          <Input
            value={form.unit}
            onChange={(event) =>
              setForm((f) => ({ ...f, unit: event.target.value }))
            }
            placeholder={t("fields.unitPlaceholder")}
            className="sm:w-40"
          />
        </Field>
      ) : null}

      {showOptions ? (
        <Field label={t("fields.options")}>
          <div className="space-y-2">
            {form.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option.value}
                  onChange={(event) =>
                    setOption(index, { value: event.target.value })
                  }
                  placeholder={t("fields.optionValue")}
                  className="flex-1"
                />
                <Input
                  value={option.label}
                  onChange={(event) =>
                    setOption(index, { label: event.target.value })
                  }
                  placeholder={t("fields.optionLabel")}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      options: f.options.filter((_, i) => i !== index),
                    }))
                  }
                  aria-label={t("fields.removeOption")}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  options: [...f.options, { value: "", label: "" }],
                }))
              }
            >
              <Plus className="size-4" />
              {t("fields.addOption")}
            </Button>
          </div>
        </Field>
      ) : null}

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-3">
          <Switch
            checked={form.required}
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, required: checked }))
            }
          />
          <span className="text-sm">{t("fields.required")}</span>
        </label>
        <label className="flex items-center gap-3">
          <Switch
            checked={form.filterable}
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, filterable: checked }))
            }
          />
          <span className="text-sm">{t("fields.filterable")}</span>
        </label>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          onClick={() => void save()}
          disabled={pending || form.label.trim() === ""}
        >
          {t("fields.save")}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          {t("fields.cancel")}
        </Button>
      </div>
    </div>
  );
}
