"use client";

import { ImageIcon, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AdPhotos } from "@/components/marketplace/ad-photos";
import {
  AttributeInput,
  VinAutofill,
  clearDependents,
} from "@/components/marketplace/dynamic-fields";
import { apiErrorText } from "@/lib/api/error-text";
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
import { MoneyInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES } from "@/lib/products/currencies";
import {
  buildRenderPlan,
  type FieldWidth,
  type LayoutItem,
} from "@/lib/marketplace/layout";
import {
  AD_CONDITIONS,
  CONTACT_METHODS,
  PRICE_TYPES,
  SETTABLE_AD_STATUSES,
  contactMethodNeedsValue,
  priceTypeHasAmount,
  type AdAttributes,
  type AdCondition,
  type AdStatus,
  type AttributeField,
  type ContactMethod,
  type MarketplaceAd,
  type MarketplaceCategory,
  type PriceType,
} from "@/lib/marketplace/types";

type Errors = Partial<Record<string, string>>;

type FieldValue = string | number | boolean | string[] | null;

/** The responsive column span per width — a 6-column grid on `sm`+, a single column on phones. */
const WIDTH_CLASS: Record<FieldWidth, string> = {
  full: "sm:col-span-6",
  two_thirds: "sm:col-span-4",
  half: "sm:col-span-3",
  third: "sm:col-span-2",
};

/**
 * The post / edit form for a marketplace ad. Fields — built-in and the chosen type's dynamic ones — are
 * laid out by the category's admin-defined form layout (sections + per-field widths on a responsive
 * grid), falling back to a sensible default order. Photos are one of the placeable widgets: real on the
 * edit screen, a "save first" placeholder on create (uploads need the ad to exist).
 *
 * The ad type is chosen before the form (the post flow's picker) and passed as `categorySlug`; when
 * editing, it comes from the ad itself. Either way it is submitted so the ad stays filed under its type.
 */
export function AdForm({
  ad,
  categorySlug,
}: {
  ad?: MarketplaceAd;
  categorySlug?: string;
}) {
  const t = useTranslations("marketplace");
  const router = useRouter();
  const editing = ad !== undefined;
  const category = ad?.category?.slug ?? categorySlug;

  const [title, setTitle] = useState(ad?.title ?? "");
  const [description, setDescription] = useState(ad?.description ?? "");
  const [priceType, setPriceType] = useState<PriceType>(
    ad?.price_type ?? "fixed",
  );
  const [priceCents, setPriceCents] = useState<number | null>(
    ad?.price ?? null,
  );
  const [currency, setCurrency] = useState(ad?.currency ?? "CAD");
  const [condition, setCondition] = useState<AdCondition | "none">(
    ad?.condition ?? "none",
  );
  const [locationLabel, setLocationLabel] = useState(ad?.location.label ?? "");
  const [contactMethod, setContactMethod] = useState<ContactMethod>(
    ad?.contact_method ?? "in_app",
  );
  const [contactValue, setContactValue] = useState(ad?.contact_value ?? "");
  const [queueEnabled, setQueueEnabled] = useState(ad?.queue_enabled ?? false);
  const [status, setStatus] = useState<AdStatus>(ad?.status ?? "available");
  const [fields, setFields] = useState<AttributeField[]>([]);
  const [layout, setLayout] = useState<MarketplaceCategory["layout"]>(null);
  const [attrValues, setAttrValues] = useState<AdAttributes>(
    ad?.attributes ?? {},
  );
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Load the chosen type's field schema + its form layout so the inputs render in the right places.
  useEffect(() => {
    if (!category) {
      return;
    }
    let cancelled = false;
    void fetch(`/api/marketplace/categories/${encodeURIComponent(category)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { category?: MarketplaceCategory } | null) => {
        if (!cancelled) {
          setFields(data?.category?.fields ?? []);
          setLayout(data?.category?.layout ?? null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [category]);

  const hasAmount = priceTypeHasAmount(priceType);
  const needsContactValue = contactMethodNeedsValue(contactMethod);
  const isFree = priceType === "free";

  const fieldByKey = useMemo(() => {
    const map = new Map<string, AttributeField>();
    for (const field of fields) {
      map.set(field.key, field);
    }
    return map;
  }, [fields]);

  const hasVehicleReference = fields.some((field) =>
    field.source?.startsWith("vehicle_"),
  );

  const plan = useMemo(() => {
    const raw = buildRenderPlan(layout, Array.from(fieldByKey.keys()));
    if (hasVehicleReference) {
      return raw;
    }
    // No vehicle fields → the VIN shortcut is meaningless; drop it (and any section it leaves empty).
    return raw
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => !(item.kind === "special" && item.key === "vin"),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [layout, fieldByKey, hasVehicleReference]);

  function setAttr(key: string, value: FieldValue) {
    setAttrValues((current) => ({ ...current, [key]: value }));
  }

  // Changing a field sets it and clears any field that depends on it (e.g. model when make changes).
  function changeAttr(key: string, value: FieldValue) {
    setAttr(key, value);
    clearDependents(fields, key, setAttr);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    setError(null);
    setPending(true);

    const body = {
      category,
      title,
      description,
      price_type: priceType,
      price: hasAmount ? priceCents : null,
      currency: hasAmount ? currency : null,
      condition: condition === "none" ? null : condition,
      location_label: locationLabel || null,
      contact_method: contactMethod,
      contact_value: needsContactValue ? contactValue : null,
      queue_enabled: isFree ? queueEnabled : false,
      attributes: attrValues,
      ...(editing ? { status } : {}),
    };

    try {
      const response = await fetch(
        editing ? `/api/marketplace/ads/${ad.slug}` : "/api/marketplace/ads",
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await response.json()) as {
        status?: string;
        ad?: MarketplaceAd;
        errors?: Record<string, string[]>;
      };

      if (response.ok && data.ad) {
        toast.success(editing ? t("form.savedToast") : t("form.postedToast"));
        router.push(`/portal/marketplace/${data.ad.slug}/edit`);
        router.refresh();
        return;
      }
      if (response.status === 422 && data.errors) {
        const flat: Errors = {};
        for (const [key, messages] of Object.entries(data.errors)) {
          flat[key] = messages[0];
        }
        setErrors(flat);
      }
      setError(apiErrorText(data) ?? t("form.error"));
    } catch {
      setError(t("form.error"));
    } finally {
      setPending(false);
    }
  }

  /** Render one built-in field widget by its key. */
  function renderCore(key: string) {
    switch (key) {
      case "title":
        return (
          <Field label={t("form.title")} error={errors.title}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              required
            />
          </Field>
        );
      case "description":
        return (
          <Field label={t("form.description")} error={errors.description}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              required
            />
          </Field>
        );
      case "price":
        return (
          <div className="space-y-4">
            <Field label={t("form.priceType")} error={errors.price_type}>
              <Select
                value={priceType}
                onValueChange={(v) => setPriceType(v as PriceType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`priceType.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {hasAmount ? (
              <Field label={t("form.price")} error={errors.price}>
                <div className="flex gap-2">
                  <MoneyInput
                    value={priceCents}
                    onChange={setPriceCents}
                    className="flex-1"
                  />
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Field>
            ) : null}

            {isFree ? (
              <label className="flex items-center gap-3">
                <Switch
                  checked={queueEnabled}
                  onCheckedChange={setQueueEnabled}
                />
                <span className="text-sm">
                  <span className="font-medium">{t("form.queue")}</span>
                  <span className="text-muted-foreground block text-xs">
                    {t("form.queueHint")}
                  </span>
                </span>
              </label>
            ) : null}
          </div>
        );
      case "condition":
        return (
          <Field label={t("form.condition")} error={errors.condition}>
            <Select
              value={condition}
              onValueChange={(v) => setCondition(v as AdCondition | "none")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("form.conditionNone")}</SelectItem>
                {AD_CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`condition.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        );
      case "location":
        return (
          <Field label={t("form.location")} error={errors.location_label}>
            <Input
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              maxLength={120}
              placeholder={t("form.locationPlaceholder")}
            />
          </Field>
        );
      case "contact":
        return (
          <div className="space-y-4">
            <Field label={t("form.contactMethod")} error={errors.contact_method}>
              <Select
                value={contactMethod}
                onValueChange={(v) => setContactMethod(v as ContactMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {t(`contactMethod.${m}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {needsContactValue ? (
              <Field label={t("form.contactValue")} error={errors.contact_value}>
                <Input
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  maxLength={255}
                />
              </Field>
            ) : null}
          </div>
        );
      case "images":
        return (
          <Field label={t("form.photos")}>
            {editing ? (
              <AdPhotos ad={ad} />
            ) : (
              <div className="text-muted-foreground bg-muted/40 flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm">
                <ImageIcon className="size-4 shrink-0" />
                {t("form.photosAfter")}
              </div>
            )}
          </Field>
        );
      default:
        return null;
    }
  }

  /** Render a special (shortcut/helper) widget by its key. */
  function renderSpecial(key: string) {
    if (key === "vin") {
      return (
        <VinAutofill
          fieldKeys={new Set(fields.map((field) => field.key))}
          onChange={setAttr}
        />
      );
    }
    return null;
  }

  function renderItem(item: LayoutItem) {
    if (item.kind === "attribute") {
      const field = fieldByKey.get(item.key);
      if (!field) {
        return null;
      }
      return (
        <AttributeInput
          field={field}
          value={attrValues[field.key] ?? null}
          error={errors[`attributes.${field.key}`]}
          values={attrValues}
          onChange={changeAttr}
        />
      );
    }
    if (item.kind === "special") {
      return renderSpecial(item.key);
    }
    return renderCore(item.key);
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {plan.map((section) => (
        <section key={section.id} className="space-y-4">
          {section.name ? (
            <h2 className="text-foreground border-b-2 pb-2 text-lg font-semibold tracking-tight">
              {section.name}
            </h2>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            {section.items.map((item) => (
              <div
                key={`${item.kind}:${item.key}`}
                className={WIDTH_CLASS[item.width]}
              >
                {renderItem(item)}
              </div>
            ))}
          </div>
        </section>
      ))}

      {editing ? (
        <Field label={t("form.status")} error={errors.status}>
          <Select value={status} onValueChange={(v) => setStatus(v as AdStatus)}>
            <SelectTrigger className="sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SETTABLE_AD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {editing ? t("form.save") : t("form.post")}
        </Button>
      </div>
    </form>
  );
}
