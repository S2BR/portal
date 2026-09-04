"use client";

import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { CatalogSighting } from "@/app/api/businesses/[slug]/products/route";
import {
  MoneyInput,
  ProductThumb,
} from "@/components/business/products/owner-products";
import { FormSection } from "@/components/business/form-section";
import {
  AddImageTile,
  type MediaUploadPhase,
  RemovableImageTile,
  UploadProgress,
} from "@/components/media/media-tiles";
import { UnitSelect } from "@/components/products/unit-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES } from "@/lib/products/currencies";
import {
  OFFERING_STATUSES,
  OFFERING_STATUS_VARIANT,
  type OfferingStatus,
} from "@/lib/products/offering-status";
import { type UnitCode, unitFor } from "@/lib/products/units";
import {
  fetchUploadConfig,
  removeUpload,
  type UploadConfig,
  upload,
} from "@/lib/uploads/upload";
import { normalizeImage } from "@/lib/uploads/image";

/**
 * The owner's page for one product in a business's catalog (a sighting). Everyone controls the offer
 * (price, currency, availability) and can add their OWN photos of it. For a HANDMADE product the
 * business created, its details (name, brand, quantity, description) are editable too; a shared
 * catalog SKU's details are global, so they're shown read-only.
 */
export function OwnerProductDetail({
  businessSlug,
  id,
}: {
  businessSlug: string;
  id: string;
}) {
  const t = useTranslations("businesses.products");
  const tStatus = useTranslations("offeringStatus");
  const router = useRouter();

  const base = `/api/businesses/${encodeURIComponent(businessSlug)}/products`;
  const listHref = `/portal/businesses/${encodeURIComponent(businessSlug)}/products`;

  const [item, setItem] = useState<CatalogSighting | null>(null);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>(CURRENCIES[0]);
  const [status, setStatus] = useState<OfferingStatus>("available");
  // Handmade product fields (edited only when the product is the business's own).
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<UnitCode | null>(null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fill the editable fields from a freshly-loaded sighting (leaves unsaved edits alone otherwise).
  const hydrate = (sighting: CatalogSighting) => {
    setName(sighting.variant?.product?.name ?? "");
    setBrand(sighting.variant?.product?.brand ?? "");
    setAmount(sighting.variant?.size ?? "");
    setUnit((sighting.variant?.unit as UnitCode | null) ?? null);
    setDescription(sighting.variant?.product?.description ?? "");
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      const response = await fetch(`${base}/${id}`);
      if (!active) {
        return;
      }
      if (response.status === 404) {
        router.replace(listHref);
        return;
      }
      if (!response.ok) {
        toast.error(t("loadError"));
        setLoading(false);
        return;
      }
      const data = (await response.json()) as { product: CatalogSighting };
      setItem(data.product);
      setPrice(data.product.price);
      setCurrency(data.product.currency ?? CURRENCIES[0]);
      setStatus(data.product.offering_status as OfferingStatus);
      hydrate(data.product);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [base, id, listHref, router, t]);

  const product = item?.variant?.product ?? null;
  const isHomemade = product?.is_homemade ?? false;

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        price,
        currency,
        offering_status: status,
      };
      // Only a handmade product's own fields are editable; a shared SKU is global (API also guards it).
      if (isHomemade) {
        body.product = {
          name: name.trim(),
          brand: brand.trim() || null,
          description: description.trim() || null,
          size: amount.trim() || null,
          unit,
        };
      }
      const response = await fetch(`${base}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        toast.error(t("actionError"));
        return;
      }
      const data = (await response.json()) as { product: CatalogSighting };
      setItem(data.product);
      toast.success(t("updated"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`${base}/${id}`, { method: "DELETE" });
      if (!response.ok) {
        toast.error(t("actionError"));
        return;
      }
      toast.success(t("removed"));
      router.push(listHref);
    } finally {
      setDeleting(false);
      setPendingDelete(false);
    }
  };

  const quantity =
    [item?.variant?.size, unitFor(item?.variant?.unit)?.symbol]
      .filter((part): part is string => Boolean(part))
      .join(" ") ||
    (item?.variant?.label ?? null);

  return (
    <div className="space-y-8">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground mb-2 -ml-2 gap-1.5"
        >
          <Link href={listHref}>
            <ArrowLeft className="size-4" aria-hidden />
            {t("detail.back")}
          </Link>
        </Button>
        {loading ? (
          <Skeleton className="h-9 w-64" />
        ) : (
          <div className="flex items-center gap-3">
            <ProductThumb
              image={item?.cover_image ?? product?.image ?? null}
              name={product?.name ?? ""}
            />
            <div className="min-w-0">
              <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
                {product?.name ?? "—"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {[product?.brand, quantity].filter(Boolean).join(" · ") || " "}
              </p>
            </div>
            {item ? (
              <Badge
                variant={
                  OFFERING_STATUS_VARIANT[
                    item.offering_status as OfferingStatus
                  ]
                }
                className="ms-auto shrink-0"
              >
                {tStatus(item.offering_status)}
              </Badge>
            ) : null}
          </div>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : item ? (
        <div className="space-y-10">
          <FormSection
            id="section-photos"
            editing
            title={t("detail.photosTitle")}
            description={t("detail.photosDescription")}
          >
            <SightingPhotos
              slug={businessSlug}
              id={id}
              images={item.images}
              onUpdated={setItem}
            />
          </FormSection>

          <FormSection
            id="section-details"
            editing
            title={t("detail.detailsTitle")}
            description={t("detail.detailsDescription")}
          >
            {isHomemade ? (
              <>
                <Field label={t("handmadeName")}>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t("handmadePlaceholder")}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("brandLabel")}>
                    <Input
                      value={brand}
                      onChange={(event) => setBrand(event.target.value)}
                    />
                  </Field>
                  <Field label={t("quantity")}>
                    <div className="flex gap-2">
                      <Input
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder={t("quantityAmount")}
                        className="w-24"
                        inputMode="decimal"
                      />
                      <UnitSelect value={unit} onChange={setUnit} />
                    </div>
                  </Field>
                </div>
                <Field label={t("descriptionLabel")}>
                  <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                  />
                </Field>
              </>
            ) : (
              <div className="space-y-1.5 text-sm">
                <p className="font-medium">{product?.name}</p>
                {product?.brand ? (
                  <p className="text-muted-foreground">{product.brand}</p>
                ) : null}
                <p className="text-muted-foreground">
                  {t("detail.sharedNote")}
                </p>
              </div>
            )}
          </FormSection>

          <FormSection
            id="section-offer"
            editing
            title={t("detail.offerTitle")}
            description={t("detail.offerDescription")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("price")}>
                <MoneyInput value={price} onChange={setPrice} />
              </Field>
              <Field label={t("currency")}>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field
              label={t("detail.statusLabel")}
              hint={t("detail.statusHint")}
            >
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as OfferingStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFERING_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tStatus(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive gap-1.5"
                onClick={() => setPendingDelete(true)}
              >
                <Trash2 className="size-4" aria-hidden />
                {t("remove")}
              </Button>
              <Button onClick={save} disabled={saving} className="gap-1.5">
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t("save")}
              </Button>
            </div>
          </FormSection>
        </div>
      ) : null}

      <Dialog
        open={pendingDelete}
        onOpenChange={(open) => (!open ? setPendingDelete(false) : undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("removeConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={deleting}>
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void remove()}
            >
              {t("remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type SightingPayload = { sighting: CatalogSighting };

/**
 * The business's own photos of one product (its sighting) — a small gallery. Files are downscaled +
 * re-encoded to WebP in the browser, then streamed straight to S3 via the `sighting-image` upload
 * type; each save returns the fresh sighting. The first photo is the cover; these show on the public
 * profile (the global product search keeps the admin image).
 */
function SightingPhotos({
  slug,
  id,
  images,
  onUpdated,
}: {
  slug: string;
  id: string;
  images: CatalogSighting["images"];
  onUpdated: (sighting: CatalogSighting) => void;
}) {
  const t = useTranslations("businesses.products");
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<MediaUploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<UploadConfig | null>(null);

  useEffect(() => {
    void fetchUploadConfig("sighting-image").then(setConfig);
  }, []);

  const busy = phase !== "idle" || removingId !== null;
  const full = config != null && images.length >= (config.max_files ?? 0);
  const maxLabel = config
    ? `${Math.round(config.max_bytes / 1024 / 1024)} MB`
    : "";

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }
    setError(null);

    let uploaded = 0;
    for (const file of files) {
      if (config && !config.mime_types.includes(file.type)) {
        setError(t("photos.invalidType"));
        continue;
      }
      if (config && file.size > config.max_bytes) {
        setError(t("photos.tooLarge"));
        continue;
      }
      const prepared = await normalizeImage(file, {
        maxSize: 1600,
        type: "image/webp",
      });
      setPhase("uploading");
      setProgress(0);
      const result = await upload<SightingPayload>("sighting-image", prepared, {
        onProgress: setProgress,
        onPhase: setPhase,
        context: { business: slug, sighting: id },
      });
      setPhase("idle");
      if (result.ok && result.data) {
        onUpdated(result.data.sighting);
        uploaded += 1;
      } else {
        toast.error(t("photos.error"));
        break;
      }
    }
    if (uploaded > 0) {
      toast.success(t("photos.saved"));
    }
  }

  async function remove(imageId: string) {
    setRemovingId(imageId);
    const result = await removeUpload<SightingPayload>("sighting-image", {
      business: slug,
      sighting: id,
      image: imageId,
    });
    setRemovingId(null);
    if (result.ok && result.data) {
      onUpdated(result.data.sighting);
    } else {
      toast.error(t("photos.error"));
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image) => (
          <RemovableImageTile
            key={image.id}
            src={image.url}
            alt={t("photos.alt")}
            onRemove={() => remove(image.id)}
            removeLabel={t("remove")}
            removing={removingId === image.id}
            disabled={busy}
          />
        ))}
        {!full ? (
          <AddImageTile
            onClick={() => inputRef.current?.click()}
            label={t("photos.add")}
            busy={busy}
          />
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={config?.mime_types.join(",")}
        multiple
        className="hidden"
        onChange={onFileChange}
      />

      <p className="text-muted-foreground text-xs">
        {t("photos.hint")}
        {maxLabel ? ` · ${t("photos.max", { max: maxLabel })}` : ""}
      </p>

      <UploadProgress
        phase={phase}
        progress={progress}
        labels={{
          uploading: (percent) => t("photos.uploading", { percent }),
          finalizing: t("photos.finalizing"),
        }}
      />
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
