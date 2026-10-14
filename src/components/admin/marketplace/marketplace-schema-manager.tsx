"use client";

import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CategoryFieldsEditor } from "@/components/admin/marketplace/category-fields-editor";
import { LocaleTextField } from "@/components/admin/marketplace/locale-text-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { apiErrorText } from "@/lib/api/error-text";
import {
  cleanLocaleMap,
  DEFAULT_LOCALE,
  readText,
  type AdminCategory,
  type LocaleMap,
} from "@/lib/marketplace/admin";

interface CategoryForm {
  name: LocaleMap;
  icon: string;
  slug: string;
  is_special: boolean;
}

const EMPTY_FORM: CategoryForm = {
  name: {},
  icon: "",
  slug: "",
  is_special: false,
};

/** The admin schema editor: manage ad types (categories) and drill into each type's fields. */
export function MarketplaceSchemaManager() {
  const t = useTranslations("admin.marketplace");
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminCategory | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketplace/categories");
      const data = (await res.json()) as { categories?: AdminCategory[] };
      setCategories(data.categories ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (selected) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="text-muted-foreground hover:text-foreground text-sm font-medium"
        >
          {t("fields.back")}
        </button>
        <CategoryFieldsEditor
          category={selected}
          onChanged={() => void load()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </header>

      <CategoryCreateForm onCreated={() => void load()} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t("categories.heading")}</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("categories.empty")}
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                onManage={() => setSelected(category)}
                onChanged={() => void load()}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** One category row: summary + inline edit, activate toggle, delete, and "manage fields". */
function CategoryRow({
  category,
  onManage,
  onChanged,
}: {
  category: AdminCategory;
  onManage: () => void;
  onChanged: () => void;
}) {
  const t = useTranslations("admin.marketplace");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/marketplace/categories/${category.id}/activation`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: !category.is_active }),
        },
      );
      if (!res.ok) {
        toast.error(t("error"));
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(t("categories.deleteConfirm"))) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/marketplace/categories/${category.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        toast.error(t("error"));
        return;
      }
      toast.success(t("categories.deleted"));
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <li className="p-3">
        <CategoryEditForm
          category={category}
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
            {readText(category.name)}
          </span>
          <Badge variant={category.is_active ? "green" : "neutral"}>
            {category.is_active
              ? t("categories.active")
              : t("categories.hidden")}
          </Badge>
          {category.is_special ? (
            <Badge variant="outline">{t("categories.special")}</Badge>
          ) : null}
        </div>
        <div className="text-muted-foreground mt-0.5 text-xs">
          {category.slug}
          {category.fields_count !== undefined
            ? ` · ${t("categories.fieldsCount", { count: category.fields_count })}`
            : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="outline" size="sm" onClick={onManage}>
          {t("categories.manageFields")}
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void toggleActive()}
          disabled={busy}
        >
          {category.is_active
            ? t("categories.deactivate")
            : t("categories.activate")}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditing(true)}
          aria-label={t("categories.edit")}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => void remove()}
          disabled={busy}
          aria-label={t("categories.delete")}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}

/** The "new type" form. */
function CategoryCreateForm({ onCreated }: { onCreated: () => void }) {
  const t = useTranslations("admin.marketplace");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {t("categories.new")}
      </Button>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <CategoryEditForm
        onSaved={() => {
          setOpen(false);
          onCreated();
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

/** Shared create/update form for a category. `category` present ⇒ edit, else create. */
function CategoryEditForm({
  category,
  onSaved,
  onCancel,
}: {
  category?: AdminCategory;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("admin.marketplace");
  const editing = category !== undefined;
  const [form, setForm] = useState<CategoryForm>(
    category
      ? {
          name: { ...category.name },
          icon: category.icon ?? "",
          slug: category.slug,
          is_special: category.is_special,
        }
      : EMPTY_FORM,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setError(null);
    setPending(true);
    try {
      const body = {
        name: cleanLocaleMap(form.name),
        icon: form.icon.trim() || null,
        is_special: form.is_special,
        ...(editing ? { slug: form.slug.trim() || undefined } : {}),
      };
      const res = await fetch(
        editing
          ? `/api/admin/marketplace/categories/${category.id}`
          : "/api/admin/marketplace/categories",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (res.ok) {
        toast.success(
          editing ? t("categories.saved") : t("categories.created"),
        );
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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <LocaleTextField
          label={t("categories.name")}
          value={form.name}
          onChange={(name) => setForm((f) => ({ ...f, name }))}
          placeholder={t("categories.namePlaceholder")}
          autoFocus
        />
        <Field label={t("categories.icon")} hint={t("categories.iconHint")}>
          <Input
            value={form.icon}
            onChange={(event) =>
              setForm((f) => ({ ...f, icon: event.target.value }))
            }
            placeholder={t("categories.iconPlaceholder")}
          />
        </Field>
      </div>
      {editing ? (
        <Field label={t("categories.slug")}>
          <Input
            value={form.slug}
            onChange={(event) =>
              setForm((f) => ({ ...f, slug: event.target.value }))
            }
            placeholder={t("categories.slugPlaceholder")}
          />
        </Field>
      ) : null}
      <label className="flex items-center gap-3">
        <Switch
          checked={form.is_special}
          onCheckedChange={(checked) =>
            setForm((f) => ({ ...f, is_special: checked }))
          }
        />
        <span className="text-sm">{t("categories.special")}</span>
      </label>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button
          onClick={() => void save()}
          disabled={pending || (form.name[DEFAULT_LOCALE] ?? "").trim() === ""}
        >
          {t("categories.save")}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          {t("categories.cancel")}
        </Button>
      </div>
    </div>
  );
}
