"use client";

import {
  ArrowLeft,
  Boxes,
  ImageIcon,
  Loader2,
  PackagePlus,
  Plus,
  ScanBarcode,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { AdminBrand } from "@/app/api/admin/brands/route";
import type { AdminFamily } from "@/app/api/admin/families/route";
import type {
  AdminProduct,
  AdminProductBody,
  BarcodeLookupResult,
  ModerationStatus,
} from "@/app/api/admin/products/route";
import type { SimilarProduct } from "@/app/api/admin/products/similar/route";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { normalizeImage } from "@/lib/uploads/image";
import { removeUpload, upload } from "@/lib/uploads/upload";

const LIST = "/portal/admin/products";

type VariantDraft = {
  key: string;
  id?: string;
  label: string;
  size: string;
  barcode: string;
  /** A remote OFF image url pending server-side import (set by a barcode lookup). */
  imageUrl?: string;
};

function blankVariant(): VariantDraft {
  return { key: crypto.randomUUID(), label: "", size: "", barcode: "" };
}

/**
 * A pending barcode-import awaiting the operator's review — what OpenFoodFacts returned for one SKU,
 * editable in the confirm dialog before it's applied to the form. `rowKey` ties it back to its SKU.
 */
type ImportDraft = {
  rowKey: string;
  barcode: string;
  name: string;
  brand: string;
  size: string;
  imageUrl: string | null;
  useImage: boolean;
  /** Existing catalog products that look like the same item — offer "add as SKU" instead of duplicating. */
  similar: SimilarProduct[];
};

/**
 * The full-page product editor (create + edit). More room than a dialog: a General section, the SKU
 * variants (each with its own image), and the product gallery. Images upload immediately (edit only —
 * a product must exist first). On save it returns to the list.
 */
export function ProductEditor({ productId }: { productId: string | null }) {
  const t = useTranslations("admin.products");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [family, setFamily] = useState("");
  const [isHomemade, setIsHomemade] = useState(false);
  const [description, setDescription] = useState("");
  const [moderation, setModeration] = useState<ModerationStatus>("approved");
  const [variants, setVariants] = useState<VariantDraft[]>([blankVariant()]);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(productId === null);
  const [loaded, setLoaded] = useState<AdminProduct | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lookingUp, setLookingUp] = useState<string | null>(null);
  const [importDraft, setImportDraft] = useState<ImportDraft | null>(null);
  const [families, setFamilies] = useState<AdminFamily[]>([]);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [similarByName, setSimilarByName] = useState<SimilarProduct[]>([]);

  // Brands + families for the assign fields' autocomplete.
  useEffect(() => {
    void (async () => {
      const [familyResponse, brandResponse] = await Promise.all([
        fetch("/api/admin/families"),
        fetch("/api/admin/brands"),
      ]);
      if (familyResponse.ok) {
        const data = (await familyResponse.json()) as { data: AdminFamily[] };
        setFamilies(data.data ?? []);
      }
      if (brandResponse.ok) {
        const data = (await brandResponse.json()) as { data: AdminBrand[] };
        setBrands(data.data ?? []);
      }
    })();
  }, []);

  // When arriving from an "add as SKU" action on another product, the barcode/size/image to append
  // as a new SKU ride in the query string.
  const addBarcode = searchParams.get("addBarcode");
  const addSize = searchParams.get("addSize");
  const addImage = searchParams.get("addImage");

  useEffect(() => {
    if (productId === null) {
      return;
    }
    let active = true;
    void (async () => {
      const response = await fetch(`/api/admin/products/${productId}`);
      if (!response.ok || !active) {
        return;
      }
      const data = (await response.json()) as { product: AdminProduct };
      const product = data.product;
      setLoaded(product);
      setName(product.name);
      setBrand(product.brand ?? "");
      setFamily(product.family?.name ?? "");
      setIsHomemade(product.is_homemade);
      setDescription(product.description ?? "");
      setModeration(product.moderation_status);

      const rows: VariantDraft[] =
        product.variants.length > 0
          ? product.variants.map((variant) => ({
              key: crypto.randomUUID(),
              id: variant.id,
              label: variant.label ?? "",
              size: variant.size ?? "",
              barcode: variant.barcode ?? "",
            }))
          : [blankVariant()];

      // Arrived via "add as SKU": append the scanned barcode/size/image as a new SKU to review.
      if (addBarcode) {
        rows.push({
          key: crypto.randomUUID(),
          label: addSize ?? "",
          size: addSize ?? "",
          barcode: addBarcode,
          imageUrl: addImage ?? undefined,
        });
      }
      setVariants(rows);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [productId, addBarcode, addSize, addImage]);

  const save = async () => {
    setSaving(true);
    try {
      const body: AdminProductBody = {
        name: name.trim(),
        brand: brand.trim() || null,
        family: family.trim() || null,
        is_homemade: isHomemade,
        description: description.trim() || null,
        moderation_status: moderation,
        variants: variants
          .filter(
            (variant) =>
              variant.label.trim() !== "" ||
              variant.size.trim() !== "" ||
              variant.barcode.trim() !== "" ||
              (variant.imageUrl ?? "") !== "",
          )
          .map((variant) => ({
            id: variant.id,
            label: variant.label.trim() || null,
            size: variant.size.trim() || null,
            barcode: variant.barcode.trim() || null,
            image_url: variant.imageUrl || null,
          })),
      };

      const response = await fetch(
        productId === null
          ? "/api/admin/products"
          : `/api/admin/products/${productId}`,
        {
          method: productId === null ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        toast.error(t("saveError"));
        return;
      }
      toast.success(t("saved"));
      router.push(LIST);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Resolve a SKU's barcode against OpenFoodFacts and open the review dialog with what it found —
   * seeded from the current form values where present (so the operator's own edits aren't lost),
   * falling back to the OFF match. Nothing is applied until the operator confirms in {@link applyImport}.
   */
  const lookupBarcode = async (index: number) => {
    const row = variants[index];
    const code = row?.barcode.trim() ?? "";
    if (!row || code === "") {
      return;
    }
    setLookingUp(row.key);
    try {
      const response = await fetch(
        `/api/admin/products/barcode-lookup?barcode=${encodeURIComponent(code)}`,
      );
      if (!response.ok) {
        toast.error(t("lookupError"));
        return;
      }
      const data = (await response.json()) as {
        found: boolean;
        product: BarcodeLookupResult | null;
      };
      if (!data.found || !data.product) {
        toast.info(t("lookupNotFound"));
        return;
      }
      const found = data.product;
      const draftName = name.trim() || (found.name ?? "");
      const draftBrand = brand.trim() || (found.brand ?? "");
      const similar = await fetchSimilar(draftName, draftBrand);

      setImportDraft({
        rowKey: row.key,
        barcode: code,
        name: draftName,
        brand: draftBrand,
        size: row.label.trim() || (found.size ?? ""),
        imageUrl: found.image_url,
        useImage: found.image_url != null,
        similar,
      });
    } finally {
      setLookingUp(null);
    }
  };

  /**
   * Apply the reviewed import draft to the form: the (possibly edited) name/brand to the product, and
   * the SKU's size/label + chosen image to its row. Then close the dialog. Nothing is persisted here —
   * it lands on Save like any other edit.
   */
  const applyImport = () => {
    if (importDraft === null) {
      return;
    }
    const draft = importDraft;

    if (draft.name.trim() !== "") {
      setName(draft.name.trim());
    }
    setBrand(draft.brand.trim());
    setVariants((current) =>
      current.map((row) =>
        row.key === draft.rowKey
          ? {
              ...row,
              label: draft.size.trim() || row.label,
              size: draft.size.trim() || row.size,
              imageUrl:
                draft.useImage && draft.imageUrl ? draft.imageUrl : undefined,
            }
          : row,
      ),
    );
    setImportDraft(null);
    toast.success(t("lookupFound"));
  };

  /** Ask the catalog whether a same-item product already exists (excluding the one being edited). */
  const fetchSimilar = useCallback(
    async (forName: string, forBrand: string): Promise<SimilarProduct[]> => {
      if (forName.trim() === "" && forBrand.trim() === "") {
        return [];
      }
      const params = new URLSearchParams();
      params.set("name", forName.trim());
      if (forBrand.trim() !== "") {
        params.set("brand", forBrand.trim());
      }
      if (productId !== null) {
        params.set("exclude", productId);
      }
      const response = await fetch(`/api/admin/products/similar?${params.toString()}`);
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as { data: SimilarProduct[] };
      return data.data ?? [];
    },
    [productId],
  );

  /** On leaving the name field, surface an inline banner if the catalog already has this product. */
  const checkSimilarByName = async () => {
    setSimilarByName(await fetchSimilar(name, brand));
  };

  /**
   * Add the scanned SKU under an EXISTING product instead of creating a duplicate: jump to that
   * product's editor with the barcode/size/image as a pending new SKU to review + save.
   */
  const addAsSku = (candidate: SimilarProduct, barcode: string, size: string, imageUrl: string | null) => {
    const params = new URLSearchParams();
    params.set("addBarcode", barcode);
    if (size.trim() !== "") {
      params.set("addSize", size.trim());
    }
    if (imageUrl) {
      params.set("addImage", imageUrl);
    }
    setImportDraft(null);
    setSimilarByName([]);
    router.push(`/portal/admin/products/${candidate.id}?${params.toString()}`);
  };

  const uploadImage = async (
    type: "product-image" | "product-variant-image",
    file: File,
    context: Record<string, unknown>,
    maxSize: number,
  ) => {
    if (!loaded) {
      return;
    }
    setUploading(true);
    try {
      const normalized = await normalizeImage(file, {
        maxSize,
        type: "image/webp",
      });
      const result = await upload<{ product: AdminProduct }>(type, normalized, {
        context: { product: loaded.id, ...context },
      });
      if (result.ok && result.data) {
        setLoaded(result.data.product);
        toast.success(t("imageAdded"));
      } else {
        toast.error(t("imageError"));
      }
    } finally {
      setUploading(false);
    }
  };

  const removeGalleryImage = async (imageId: string) => {
    if (!loaded) {
      return;
    }
    const result = await removeUpload<{ product: AdminProduct }>(
      "product-image",
      {
        product: loaded.id,
        image: imageId,
      },
    );
    if (result.ok && result.data) {
      setLoaded(result.data.product);
    } else {
      toast.error(t("imageError"));
    }
  };

  const variantImage = (variantId: string | undefined): string | null =>
    variantId
      ? (loaded?.variants.find((variant) => variant.id === variantId)?.image ??
        null)
      : null;

  return (
    <div className="space-y-8">
      <div>
        <button
          type="button"
          onClick={() => router.push(LIST)}
          className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToCatalog")}
        </button>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {productId === null ? t("new") : t("editTitle")}
        </h1>
      </div>

      {!ready ? (
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          <div className="space-y-8 lg:col-span-2">
            <section className="space-y-4">
              <Field label={t("name")}>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={checkSimilarByName}
                />
              </Field>

              {similarByName.length > 0 ? (
                <SimilarMatches
                  matches={similarByName}
                  onDismiss={() => setSimilarByName([])}
                />
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("brand")}>
                  <Input
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    list="product-brand-options"
                  />
                  <datalist id="product-brand-options">
                    {brands.map((item) => (
                      <option key={item.id} value={item.name} />
                    ))}
                  </datalist>
                </Field>
                <Field label={t("status")}>
                  <Select
                    value={moderation}
                    onValueChange={(value) =>
                      setModeration(value as ModerationStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        ["approved", "pending", "rejected", "draft"] as const
                      ).map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`filter.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label={t("family")} hint={t("familyHint")}>
                <div className="relative">
                  <Boxes
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                    aria-hidden
                  />
                  <Input
                    value={family}
                    onChange={(event) => setFamily(event.target.value)}
                    list="product-family-options"
                    placeholder={t("familyPlaceholder")}
                    className="pl-8"
                  />
                </div>
                <datalist id="product-family-options">
                  {families.map((item) => (
                    <option key={item.id} value={item.name} />
                  ))}
                </datalist>
              </Field>
              <Field label={t("description")}>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                />
              </Field>
              <label className="flex max-w-sm items-center justify-between gap-3 text-sm">
                {t("isHomemade")}
                <Switch checked={isHomemade} onCheckedChange={setIsHomemade} />
              </label>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">{t("variants")}</h2>
              {variants.map((variant, index) => (
                <div key={variant.key} className="flex items-center gap-2">
                  {variant.id ? (
                    <ImageThumb
                      // Prefer the SKU's stored image; before it's saved/imported, optimistically
                      // show the pending lookup image so the thumbnail updates the moment you scan.
                      url={variantImage(variant.id) ?? variant.imageUrl ?? null}
                      busy={uploading}
                      label={t("skuImage")}
                      onFile={(file) =>
                        uploadImage(
                          "product-variant-image",
                          file,
                          { variant: variant.id ?? "" },
                          800,
                        )
                      }
                    />
                  ) : variant.imageUrl ? (
                    <span
                      className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border"
                      title={t("skuImagePending")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={variant.imageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    </span>
                  ) : null}
                  <Input
                    value={variant.label}
                    onChange={(event) =>
                      setVariants((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, label: event.target.value }
                            : row,
                        ),
                      )
                    }
                    placeholder={t("variantLabel")}
                  />
                  <Input
                    value={variant.barcode}
                    onChange={(event) =>
                      setVariants((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, barcode: event.target.value }
                            : row,
                        ),
                      )
                    }
                    placeholder={t("variantBarcode")}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={
                      variant.barcode.trim() === "" ||
                      lookingUp === variant.key
                    }
                    onClick={() => lookupBarcode(index)}
                    aria-label={t("lookupBarcode")}
                    title={t("lookupBarcode")}
                  >
                    {lookingUp === variant.key ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <ScanBarcode className="size-4" aria-hidden />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive shrink-0"
                    onClick={() =>
                      setVariants((current) =>
                        current.length > 1
                          ? current.filter((_, rowIndex) => rowIndex !== index)
                          : current,
                      )
                    }
                    aria-label={t("removeVariant")}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setVariants((current) => [...current, blankVariant()])
                }
                className="gap-1.5"
              >
                <Plus className="size-4" aria-hidden />
                {t("addVariant")}
              </Button>
            </section>
          </div>

          <div className="lg:col-span-1">
            {loaded ? (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold">{t("gallery")}</h2>
                <div className="flex flex-wrap gap-2">
                  {loaded.images.map((image) => (
                    <div key={image.id} className="group relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url ?? ""}
                        alt=""
                        className="size-20 rounded-md border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(image.id)}
                        aria-label={t("removeImage")}
                        className="bg-background absolute -top-1.5 -right-1.5 rounded-full border p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                      >
                        <X className="size-3" aria-hidden />
                      </button>
                    </div>
                  ))}
                  <ImageUpload
                    label={t("addImage")}
                    busy={uploading}
                    onFile={(file) =>
                      uploadImage("product-image", file, {}, 1200)
                    }
                  />
                </div>
              </section>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t("saveFirstForImages")}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t pt-6">
        <Button variant="ghost" onClick={() => router.push(LIST)}>
          {t("cancel")}
        </Button>
        <Button
          onClick={save}
          disabled={saving || name.trim() === "" || !ready}
        >
          {t("save")}
        </Button>
      </div>

      <Dialog
        open={importDraft !== null}
        onOpenChange={(open) => {
          if (!open) {
            setImportDraft(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("importTitle")}</DialogTitle>
            <DialogDescription>{t("importDescription")}</DialogDescription>
          </DialogHeader>
          {importDraft ? (
            <div className="space-y-4">
              {importDraft.similar.length > 0 ? (
                <SimilarMatches
                  matches={importDraft.similar}
                  onAdd={(candidate) =>
                    addAsSku(
                      candidate,
                      importDraft.barcode,
                      importDraft.size,
                      importDraft.useImage ? importDraft.imageUrl : null,
                    )
                  }
                />
              ) : null}
              <Field label={t("name")}>
                <Input
                  value={importDraft.name}
                  onChange={(event) =>
                    setImportDraft({ ...importDraft, name: event.target.value })
                  }
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("brand")}>
                  <Input
                    value={importDraft.brand}
                    onChange={(event) =>
                      setImportDraft({
                        ...importDraft,
                        brand: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label={t("variantLabel")}>
                  <Input
                    value={importDraft.size}
                    onChange={(event) =>
                      setImportDraft({ ...importDraft, size: event.target.value })
                    }
                  />
                </Field>
              </div>
              <div>
                <span className="text-sm font-medium">
                  {t("importImageLabel")}
                </span>
                {importDraft.imageUrl ? (
                  <label className="mt-2 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={importDraft.imageUrl}
                      alt=""
                      className="size-16 rounded-md border object-cover"
                    />
                    <span className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={importDraft.useImage}
                        onCheckedChange={(value) =>
                          setImportDraft({
                            ...importDraft,
                            useImage: value === true,
                          })
                        }
                      />
                      {t("importUseImage")}
                    </span>
                  </label>
                ) : (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {t("importNoImage")}
                  </p>
                )}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportDraft(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={applyImport}>{t("importConfirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The "a similar product already exists" panel. With `onAdd` (a barcode is in hand) each candidate
 * offers **Add as SKU** — jump to it and append the scanned SKU; without it (a name-only check) each
 * candidate just links to its editor. Suggestion only — dismissable, never blocks creating a new one.
 */
function SimilarMatches({
  matches,
  onAdd,
  onDismiss,
}: {
  matches: SimilarProduct[];
  onAdd?: (candidate: SimilarProduct) => void;
  onDismiss?: () => void;
}) {
  const t = useTranslations("admin.products");
  return (
    <div className="border-brand-green/40 bg-brand-green/5 space-y-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{t("similarTitle")}</p>
          <p className="text-muted-foreground text-xs">{t("similarDescription")}</p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t("dismiss")}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <ul className="space-y-1.5">
        {matches.map((match) => (
          <li
            key={match.id}
            className="bg-background flex items-center gap-2 rounded-md border px-2.5 py-1.5"
          >
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {match.name}
              </span>
              <span className="text-muted-foreground block truncate text-xs">
                {[match.brand, match.family, t("similarSkus", { count: match.sku_count })]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            {onAdd ? (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5"
                onClick={() => onAdd(match)}
              >
                <PackagePlus className="size-3.5" aria-hidden />
                {t("addAsSku")}
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link href={`/portal/admin/products/${match.id}`}>{t("open")}</Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A dashed "add image" tile that opens a file picker. */
function ImageUpload({
  label,
  onFile,
  busy,
}: {
  label: string;
  onFile: (file: File) => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFile(file);
          }
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="border-muted-foreground/30 text-muted-foreground hover:bg-muted/60 flex size-20 items-center justify-center rounded-md border border-dashed disabled:opacity-50"
      >
        <ImageIcon className="size-5" aria-hidden />
        <span className="sr-only">{label}</span>
      </button>
    </>
  );
}

/** A small per-SKU image button: shows the thumbnail, or a placeholder to upload one. */
function ImageThumb({
  url,
  onFile,
  busy,
  label,
}: {
  url: string | null;
  onFile: (file: File) => void;
  busy: boolean;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFile(file);
          }
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        aria-label={label}
        className="bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border disabled:opacity-50"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <ImageIcon className="text-muted-foreground size-4" aria-hidden />
        )}
      </button>
    </>
  );
}
