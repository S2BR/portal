"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { AdminBrand } from "@/app/api/admin/brands/route";
import type {
  AdminFamily,
  AdminFamilyBody,
} from "@/app/api/admin/families/route";
import { EntityProducts } from "@/components/admin/catalog/entity-products";
import { FormSection } from "@/components/business/form-section";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

/**
 * A family's detail page: rename/describe it and set its brand (top), then manage the products in the
 * line (add new pre-assigned, attach existing, detach). Reached from the families index.
 */
export function FamilyDetail({ id }: { id: string }) {
  const t = useTranslations("admin.families");
  const router = useRouter();

  const [family, setFamily] = useState<AdminFamily | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/admin/brands");
      if (response.ok) {
        const data = (await response.json()) as { data: AdminBrand[] };
        setBrands(data.data ?? []);
      }
    })();
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const response = await fetch(`/api/admin/families/${id}`);
      if (!active) {
        return;
      }
      if (response.status === 404) {
        router.replace("/portal/admin/families");
        return;
      }
      if (!response.ok) {
        toast.error(t("loadError"));
        setLoading(false);
        return;
      }
      const data = (await response.json()) as { family: AdminFamily };
      setFamily(data.family);
      setName(data.family.name);
      setBrand(data.family.brand?.name ?? "");
      setDescription(data.family.description ?? "");
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, router, t]);

  const save = async () => {
    if (name.trim() === "") {
      return;
    }
    setSaving(true);
    try {
      const body: AdminFamilyBody = {
        name: name.trim(),
        brand: brand.trim() || null,
        description: description.trim() || null,
      };
      const response = await fetch(`/api/admin/families/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        toast.error(response.status === 422 ? t("duplicate") : t("saveError"));
        return;
      }
      const data = (await response.json()) as { family: AdminFamily };
      setFamily(data.family);
      setName(data.family.name);
      setBrand(data.family.brand?.name ?? "");
      toast.success(t("saved"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground mb-2 -ml-2 gap-1.5"
        >
          <Link href="/portal/admin/families">
            <ArrowLeft className="size-4" aria-hidden />
            {t("detail.back")}
          </Link>
        </Button>
        {loading ? (
          <Skeleton className="h-9 w-64" />
        ) : (
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {family?.name}
          </h1>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : family ? (
        <div className="space-y-10">
          <FormSection
            id="section-details"
            editing
            title={t("detail.detailsTitle")}
            description={t("detail.detailsDescription")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("form.name")}>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <Field label={t("form.brand")}>
                <Input
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  list="family-detail-brand-options"
                  placeholder={t("form.brandPlaceholder")}
                />
                <datalist id="family-detail-brand-options">
                  {brands.map((item) => (
                    <option key={item.id} value={item.name} />
                  ))}
                </datalist>
              </Field>
            </div>
            <Field label={t("form.description")}>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </Field>
            <div className="flex justify-end">
              <Button
                onClick={save}
                disabled={saving || name.trim() === ""}
                className="gap-1.5"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t("save")}
              </Button>
            </div>
          </FormSection>

          <FormSection
            id="section-products"
            editing
            title={t("detail.productsTitle")}
            description={t("detail.productsDescription")}
          >
            <EntityProducts kind="family" entityId={family.id} />
          </FormSection>
        </div>
      ) : null}
    </div>
  );
}
