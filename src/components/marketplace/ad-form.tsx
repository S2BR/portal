"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES } from "@/lib/products/currencies";
import {
  AD_CONDITIONS,
  CONTACT_METHODS,
  PRICE_TYPES,
  SETTABLE_AD_STATUSES,
  contactMethodNeedsValue,
  priceTypeHasAmount,
  type AdCondition,
  type AdStatus,
  type ContactMethod,
  type MarketplaceAd,
  type PriceType,
} from "@/lib/marketplace/types";

type Errors = Partial<Record<string, string>>;

/**
 * The post / edit form for a marketplace ad (base fields). Photos are added separately (after the ad
 * exists) on the edit screen. On create it redirects to the edit page so photos can be attached.
 */
export function AdForm({ ad }: { ad?: MarketplaceAd }) {
  const t = useTranslations("marketplace");
  const router = useRouter();
  const editing = ad !== undefined;

  const [title, setTitle] = useState(ad?.title ?? "");
  const [description, setDescription] = useState(ad?.description ?? "");
  const [priceType, setPriceType] = useState<PriceType>(
    ad?.price_type ?? "fixed",
  );
  const [price, setPrice] = useState(
    ad?.price != null ? (ad.price / 100).toString() : "",
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
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const hasAmount = priceTypeHasAmount(priceType);
  const needsContactValue = contactMethodNeedsValue(contactMethod);
  const isFree = priceType === "free";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    setError(null);
    setPending(true);

    const body = {
      title,
      description,
      price_type: priceType,
      price: hasAmount && price !== "" ? Math.round(Number(price) * 100) : null,
      currency: hasAmount ? currency : null,
      condition: condition === "none" ? null : condition,
      location_label: locationLabel || null,
      contact_method: contactMethod,
      contact_value: needsContactValue ? contactValue : null,
      queue_enabled: isFree ? queueEnabled : false,
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

  return (
    <form onSubmit={submit} className="space-y-6">
      <Field label={t("form.title")} error={errors.title}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={150}
          required
        />
      </Field>

      <Field label={t("form.description")} error={errors.description}>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
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
              <Input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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
      </div>

      {isFree ? (
        <label className="flex items-center gap-3">
          <Switch checked={queueEnabled} onCheckedChange={setQueueEnabled} />
          <span className="text-sm">
            <span className="font-medium">{t("form.queue")}</span>
            <span className="text-muted-foreground block text-xs">
              {t("form.queueHint")}
            </span>
          </span>
        </label>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
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

        <Field label={t("form.location")} error={errors.location_label}>
          <Input
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            maxLength={120}
            placeholder={t("form.locationPlaceholder")}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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

      {editing ? (
        <Field label={t("form.status")} error={errors.status}>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as AdStatus)}
          >
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
        {!editing ? (
          <span className="text-muted-foreground text-xs">
            {t("form.photosAfter")}
          </span>
        ) : null}
      </div>
    </form>
  );
}
