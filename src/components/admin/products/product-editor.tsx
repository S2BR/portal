"use client";

import {
  ArrowLeft,
  Boxes,
  ImageIcon,
  Keyboard,
  Loader2,
  Merge,
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
  AdminProductListItem,
  BarcodeLookupResult,
  ModerationStatus,
} from "@/app/api/admin/products/route";
import type { BarcodeOwner } from "@/app/api/admin/products/by-barcode/route";
import { searchCatalog, type CatalogHit } from "@/lib/products/typesense";
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
import { FormSection } from "@/components/business/form-section";
import {
  AddImageTile,
  RemovableImageTile,
} from "@/components/media/media-tiles";
import {
  DragHandle,
  overlayClass,
  placeholderClass,
} from "@/components/ui/drag-handle";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortableList } from "@/components/ui/sortable-list";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { normalizeImage } from "@/lib/uploads/image";
import { removeUpload, upload } from "@/lib/uploads/upload";
import { cn } from "@/lib/utils";

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

/** Lowercased, accent-stripped words of length ≥ 3 — the significant tokens of a product name. */
function significantTokens(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length >= 3);
}

/**
 * Whether a catalog `name` is close enough to `query` to be a likely DUPLICATE (not merely the same
 * category). Typesense's fuzzy search returns anything sharing a common word — "Farofa Pronta" for
 * "Farofa Temperada Yoki" — so require that most of the query's significant words are present, which
 * keeps real near-duplicates and drops same-word-different-product noise.
 */
function looksLikeDuplicate(query: string, name: string): boolean {
  const queryTokens = significantTokens(query);
  if (queryTokens.length === 0) {
    return false;
  }
  const nameTokens = new Set(significantTokens(name));
  const matched = queryTokens.filter((token) => nameTokens.has(token)).length;
  return matched / queryTokens.length >= 0.6;
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
  similar: CatalogHit[];
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
  const [similarByName, setSimilarByName] = useState<CatalogHit[]>([]);
  // New products open on an intake chooser (barcode vs manual) before the form; editing skips it.
  const [stage, setStage] = useState<"choose" | "form">(
    productId === null ? "choose" : "form",
  );
  const [intakeBarcode, setIntakeBarcode] = useState("");
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  // Server-side validation errors, surfaced on the offending fields (keyed by variant `key`).
  const [nameError, setNameError] = useState<string | null>(null);
  const [variantErrors, setVariantErrors] = useState<Record<string, string>>(
    {},
  );
  // For a barcode that's already taken: the existing product that owns it (with a note when it's
  // hidden from search — private / pending / deleted), keyed by variant `key`, to link to.
  const [barcodeConflicts, setBarcodeConflicts] = useState<
    Record<string, { id: string; name: string; note: string | null }>
  >({});

  /**
   * Resolve a barcode to the product that already carries it, from the DATABASE — authoritative across
   * private / unapproved / soft-deleted products the search index can't see. Excludes the product being
   * edited (its own barcodes aren't conflicts). Returns a `note` when the owner is hidden from search.
   */
  const findBarcodeOwner = useCallback(
    async (
      barcode: string,
    ): Promise<{ id: string; name: string; note: string | null } | null> => {
      try {
        const response = await fetch(
          `/api/admin/products/by-barcode?barcode=${encodeURIComponent(barcode)}`,
        );
        if (!response.ok) {
          return null;
        }
        const data = (await response.json()) as {
          found: boolean;
          product: BarcodeOwner | null;
        };
        const owner = data.product;
        if (!data.found || !owner || owner.id === productId) {
          return null;
        }
        const note = owner.is_deleted
          ? t("barcodeDeleted")
          : !owner.is_shared
            ? t("barcodePrivate")
            : owner.moderation_status !== "approved"
              ? t("barcodePending")
              : null;
        return { id: owner.id, name: owner.name, note };
      } catch {
        return null;
      }
    },
    [productId, t],
  );

  /** Drop the validation error + conflict for one SKU row (called as its barcode is edited). */
  const clearVariantError = (key: string) => {
    setVariantErrors((prev) => {
      if (!prev[key]) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setBarcodeConflicts((prev) => {
      if (!prev[key]) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

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
    setNameError(null);
    setVariantErrors({});
    setBarcodeConflicts({});
    try {
      // The SKUs actually sent (blank rows dropped) — the API keys its errors by this array's index.
      const kept = variants.filter(
        (variant) =>
          variant.label.trim() !== "" ||
          variant.size.trim() !== "" ||
          variant.barcode.trim() !== "" ||
          (variant.imageUrl ?? "") !== "",
      );
      const body: AdminProductBody = {
        name: name.trim(),
        brand: brand.trim() || null,
        family: family.trim() || null,
        is_homemade: isHomemade,
        description: description.trim() || null,
        moderation_status: moderation,
        variants: kept.map((variant) => ({
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
        await showSaveErrors(response, kept);
        return;
      }
      toast.success(t("saved"));
      router.push(LIST);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Surface a failed save. A 422 carries per-field messages (`variants.0.barcode`, `name`, …) — map
   * them onto the offending fields, and for a barcode that's already taken, look up which existing
   * product owns it so the operator can jump straight there instead of hitting a dead end.
   */
  const showSaveErrors = async (response: Response, kept: VariantDraft[]) => {
    const data = (await response.json().catch(() => null)) as {
      errors?: Record<string, string[]>;
    } | null;
    const errors = data?.errors;
    if (!errors) {
      toast.error(t("saveError"));
      return;
    }

    const nextVariantErrors: Record<string, string> = {};
    const conflicts: { key: string; barcode: string }[] = [];
    let firstName: string | null = null;
    const others: string[] = [];

    for (const [field, messages] of Object.entries(errors)) {
      const message = messages[0] ?? "";
      const match = field.match(/^variants\.(\d+)\.barcode$/);
      if (match) {
        const row = kept[Number(match[1])];
        if (!row) {
          continue;
        }
        const taken = /taken|unique|exist/i.test(message);
        nextVariantErrors[row.key] = taken ? t("barcodeTaken") : message;
        if (taken && row.barcode.trim() !== "") {
          conflicts.push({ key: row.key, barcode: row.barcode.trim() });
        }
      } else if (field === "name") {
        firstName = message;
      } else {
        others.push(message);
      }
    }

    setVariantErrors(nextVariantErrors);
    setNameError(firstName);
    toast.error(
      firstName ??
        Object.values(nextVariantErrors)[0] ??
        others[0] ??
        t("saveError"),
    );

    // Resolve each taken barcode to the product that already carries it (authoritative DB lookup —
    // finds it even when the owner is private / unapproved / soft-deleted).
    for (const { key, barcode } of conflicts) {
      void findBarcodeOwner(barcode).then((owner) => {
        if (owner) {
          setBarcodeConflicts((prev) => ({ ...prev, [key]: owner }));
        }
      });
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
      const similar = await fetchSimilar(draftName);

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

  /**
   * Whether a same-item product already exists — searched DIRECTLY against Typesense (fuzzy,
   * accent-tolerant), no API/DB in the path. Excludes the product being edited.
   */
  const fetchSimilar = useCallback(
    async (forName: string): Promise<CatalogHit[]> => {
      // Duplicate detection keys on the NAME (a brand alone matches its whole line). Fuzzy Typesense
      // hits are then filtered to genuine near-duplicates so unrelated same-word products don't show.
      const query = forName.trim();
      if (query.length < 3) {
        return [];
      }
      const hits = await searchCatalog(query, {
        excludeId: productId ?? undefined,
      });
      return hits.filter((hit) => looksLikeDuplicate(query, hit.name));
    },
    [productId],
  );

  // Live "does this already exist?" check as the name (or brand) is typed on a NEW product, so a
  // duplicate is caught before it's created.
  useEffect(() => {
    if (productId !== null || stage !== "form") {
      return;
    }
    const handle = setTimeout(() => {
      void fetchSimilar(name).then(setSimilarByName);
    }, 400);
    return () => clearTimeout(handle);
  }, [name, productId, stage, fetchSimilar]);

  // Live "already registered?" check: the moment a SKU barcode is entered (typed, scanned, or seeded
  // from the barcode-intake step), look it up in the catalog and, if it's already there, flag the row
  // with a link to the product that owns it — so a duplicate is caught on entry, not at save.
  const barcodeSignature = variants
    .map((variant) => `${variant.key}:${variant.barcode.trim()}`)
    .join("|");
  useEffect(() => {
    const rows = barcodeSignature
      .split("|")
      .map((pair) => {
        const separator = pair.indexOf(":");
        return {
          key: pair.slice(0, separator),
          barcode: pair.slice(separator + 1),
        };
      })
      .filter((row) => row.barcode !== "");
    if (rows.length === 0) {
      return;
    }
    const handle = setTimeout(() => {
      for (const row of rows) {
        void findBarcodeOwner(row.barcode).then((owner) => {
          setBarcodeConflicts((prev) => {
            if (owner) {
              if (
                prev[row.key]?.id === owner.id &&
                prev[row.key]?.note === owner.note
              ) {
                return prev;
              }
              return { ...prev, [row.key]: owner };
            }
            if (!prev[row.key]) {
              return prev;
            }
            const next = { ...prev };
            delete next[row.key];
            return next;
          });
        });
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [barcodeSignature, findBarcodeOwner]);

  /**
   * Add the scanned SKU under an EXISTING product instead of creating a duplicate: jump to that
   * product's editor with the barcode/size/image as a pending new SKU to review + save.
   */
  const addAsSku = (
    candidate: CatalogHit,
    barcode: string,
    size: string,
    imageUrl: string | null,
  ) => {
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

  /**
   * Intake (new product): look the barcode up and open the form pre-filled with what OpenFoodFacts
   * returns — name, brand, and a first SKU (size + barcode + image). No match just seeds the barcode
   * so the operator continues manually. Similar existing products are surfaced either way.
   */
  const startFromBarcode = async () => {
    const code = intakeBarcode.trim();
    if (code === "") {
      return;
    }
    setIntakeLoading(true);
    try {
      const response = await fetch(
        `/api/admin/products/barcode-lookup?barcode=${encodeURIComponent(code)}`,
      );
      const data = response.ok
        ? ((await response.json()) as {
            found: boolean;
            product: BarcodeLookupResult | null;
          })
        : { found: false, product: null };
      const found = data.product;
      if (data.found && found) {
        setName(found.name ?? "");
        setBrand(found.brand ?? "");
        setVariants([
          {
            key: crypto.randomUUID(),
            label: found.size ?? "",
            size: found.size ?? "",
            barcode: code,
            imageUrl: found.image_url ?? undefined,
          },
        ]);
        setSimilarByName(await fetchSimilar(found.name ?? ""));
        toast.success(t("lookupFound"));
      } else {
        setVariants([
          { key: crypto.randomUUID(), label: "", size: "", barcode: code },
        ]);
        toast.info(t("lookupNotFound"));
      }
      setStage("form");
    } finally {
      setIntakeLoading(false);
    }
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

  const reorderGalleryImages = async (next: AdminProduct["images"]) => {
    if (!loaded) {
      return;
    }
    const previous = loaded.images;
    setLoaded({ ...loaded, images: next }); // optimistic
    try {
      const response = await fetch(
        `/api/admin/products/${loaded.id}/images/reorder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: next.map((image) => image.id) }),
        },
      );
      if (!response.ok) {
        setLoaded({ ...loaded, images: previous }); // rollback
        toast.error(t("imageError"));
        return;
      }
      const data = (await response.json()) as { product?: AdminProduct };
      if (data.product) {
        setLoaded(data.product);
      }
    } catch {
      setLoaded({ ...loaded, images: previous });
      toast.error(t("imageError"));
    }
  };

  const removeVariantImage = async (variantId: string) => {
    if (!loaded) {
      return;
    }
    const result = await removeUpload<{ product: AdminProduct }>(
      "product-variant-image",
      { product: loaded.id, variant: variantId },
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
      <div className="flex items-start justify-between gap-3">
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
        {productId !== null ? (
          <Button
            variant="outline"
            size="sm"
            className="mt-1 shrink-0 gap-1.5"
            onClick={() => setMergeOpen(true)}
          >
            <Merge className="size-4" aria-hidden />
            {t("mergeInto")}
          </Button>
        ) : null}
      </div>

      {!ready ? (
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
      ) : stage === "choose" ? (
        <IntakeChooser
          barcode={intakeBarcode}
          onBarcodeChange={setIntakeBarcode}
          onLookup={startFromBarcode}
          onManual={() => setStage("form")}
          loading={intakeLoading}
        />
      ) : (
        <div>
          <FormSection
            id="section-gallery"
            editing
            title={t("section.gallery.title")}
            description={t("section.gallery.description")}
          >
            {loaded ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-3">
                <SortableList
                  items={loaded.images}
                  getId={(image) => image.id}
                  onReorder={reorderGalleryImages}
                  strategy="rect"
                  className="contents"
                  renderOverlay={(image) => (
                    <div
                      className={cn("overflow-hidden rounded-lg", overlayClass)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url ?? ""}
                        alt=""
                        className="aspect-square w-full object-cover"
                      />
                    </div>
                  )}
                  renderItem={(image, render) => (
                    <div
                      ref={render.setNodeRef}
                      style={render.style}
                      className={cn(
                        "group/tile relative",
                        render.isDragging && "opacity-40",
                      )}
                    >
                      <RemovableImageTile
                        src={image.url}
                        alt={t("gallery")}
                        onRemove={() => removeGalleryImage(image.id)}
                        removeLabel={t("removeImage")}
                        disabled={uploading}
                      />
                      {loaded.images.length > 1 ? (
                        <DragHandle
                          ref={render.handle.ref}
                          {...render.handle.attributes}
                          {...render.handle.listeners}
                          label={t("reorderImage")}
                          className="bg-background/90 absolute start-1 top-1 rounded p-0.5 opacity-0 shadow-sm transition-opacity group-hover/tile:opacity-100"
                        />
                      ) : null}
                    </div>
                  )}
                />
                <ImageUpload
                  label={t("addImage")}
                  busy={uploading}
                  onFile={(file) =>
                    uploadImage("product-image", file, {}, 1200)
                  }
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t("saveFirstForImages")}
              </p>
            )}
          </FormSection>

          <FormSection
            id="section-general"
            editing
            title={t("section.general.title")}
            description={t("section.general.description")}
          >
            <Field label={t("name")} error={nameError}>
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError(null);
                }}
              />
            </Field>

            {similarByName.length > 0 ? (
              <SimilarMatches
                matches={similarByName}
                onAdd={(candidate) =>
                  addAsSku(
                    candidate,
                    variants[0]?.barcode.trim() ?? "",
                    variants[0]?.size.trim() || variants[0]?.label.trim() || "",
                    variants[0]?.imageUrl ?? null,
                  )
                }
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
          </FormSection>

          <FormSection
            id="section-skus"
            editing
            title={t("section.skus.title")}
            description={t("section.skus.description")}
          >
            <SortableList
              items={variants}
              getId={(variant) => variant.key}
              onReorder={setVariants}
              className="space-y-1.5"
              renderOverlay={(variant) => (
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium",
                    overlayClass,
                  )}
                >
                  {variant.label.trim() ||
                    variant.barcode.trim() ||
                    t("variantLabel")}
                </div>
              )}
              renderItem={(variant, render) => {
                const index = variants.findIndex(
                  (row) => row.key === variant.key,
                );
                return (
                  <div
                    ref={render.setNodeRef}
                    style={render.style}
                    className="space-y-1.5"
                  >
                    {render.isDragging ? (
                      <div className={cn("h-10", placeholderClass)} />
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <DragHandle
                            ref={render.handle.ref}
                            {...render.handle.attributes}
                            {...render.handle.listeners}
                            label={t("reorderSku")}
                          />
                          {variant.id ? (
                            <ImageThumb
                              // Prefer the SKU's stored image; before it's saved/imported, optimistically
                              // show the pending lookup image so the thumbnail updates the moment you scan.
                              url={
                                variantImage(variant.id) ??
                                variant.imageUrl ??
                                null
                              }
                              // A stored image can be removed; a pending (not-yet-saved) one cannot.
                              removable={variantImage(variant.id) !== null}
                              busy={uploading}
                              uploadLabel={t("skuImage")}
                              removeLabel={t("removeImage")}
                              onFile={(file) =>
                                uploadImage(
                                  "product-variant-image",
                                  file,
                                  { variant: variant.id ?? "" },
                                  800,
                                )
                              }
                              onRemove={() =>
                                removeVariantImage(variant.id ?? "")
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
                            aria-invalid={
                              variantErrors[variant.key] ||
                              barcodeConflicts[variant.key]
                                ? true
                                : undefined
                            }
                            onChange={(event) => {
                              const value = event.target.value;
                              setVariants((current) =>
                                current.map((row, rowIndex) =>
                                  rowIndex === index
                                    ? { ...row, barcode: value }
                                    : row,
                                ),
                              );
                              clearVariantError(variant.key);
                            }}
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
                              <Loader2
                                className="size-4 animate-spin"
                                aria-hidden
                              />
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
                                  ? current.filter(
                                      (_, rowIndex) => rowIndex !== index,
                                    )
                                  : current,
                              )
                            }
                            aria-label={t("removeVariant")}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                        {barcodeConflicts[variant.key] ? (
                          <p className="text-xs text-amber-600 dark:text-amber-500">
                            {t("barcodeOwnedBy")}{" "}
                            <Link
                              href={`/portal/admin/products/${barcodeConflicts[variant.key]?.id}`}
                              className="font-medium underline"
                            >
                              {barcodeConflicts[variant.key]?.name}
                            </Link>
                            {barcodeConflicts[variant.key]?.note ? (
                              <span className="text-muted-foreground">
                                {" "}
                                ({barcodeConflicts[variant.key]?.note})
                              </span>
                            ) : null}
                          </p>
                        ) : variantErrors[variant.key] ? (
                          <p className="text-destructive text-xs">
                            {variantErrors[variant.key]}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              }}
            />
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
          </FormSection>
        </div>
      )}

      {stage === "form" ? (
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
      ) : null}

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
                      setImportDraft({
                        ...importDraft,
                        size: event.target.value,
                      })
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

      {productId !== null ? (
        <MergeDialog
          sourceId={productId}
          open={mergeOpen}
          onOpenChange={setMergeOpen}
        />
      ) : null}
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
  matches: CatalogHit[];
  onAdd?: (candidate: CatalogHit) => void;
  onDismiss?: () => void;
}) {
  const t = useTranslations("admin.products");
  return (
    <div className="border-brand-green/40 bg-brand-green/5 space-y-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{t("similarTitle")}</p>
          <p className="text-muted-foreground text-xs">
            {t("similarDescription")}
          </p>
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
                {[
                  match.brand,
                  match.family,
                  t("similarSkus", { count: match.sku_count }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button asChild size="sm" variant="ghost">
                <Link href={`/portal/admin/products/${match.id}`}>
                  {t("open")}
                </Link>
              </Button>
              {onAdd ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => onAdd(match)}
                >
                  <PackagePlus className="size-3.5" aria-hidden />
                  {t("addAsSku")}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Merge this product (the source) into another (the target): search the catalog, pick the keeper, and
 * the source's SKUs/images/categories move to it and the source is soft-deleted. Cleans up duplicates.
 */
function MergeDialog({
  sourceId,
  open,
  onOpenChange,
}: {
  sourceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("admin.products");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminProductListItem[]>([]);
  const [merging, setMerging] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handle = setTimeout(() => {
      if (query.trim() === "") {
        setResults([]);
        return;
      }
      void (async () => {
        const params = new URLSearchParams();
        params.set("filter[name][contains]", query.trim());
        params.set("visibility", "all");
        const response = await fetch(
          `/api/admin/products?${params.toString()}`,
        );
        if (response.ok) {
          const data = (await response.json()) as {
            data: AdminProductListItem[];
          };
          setResults((data.data ?? []).filter((item) => item.id !== sourceId));
        }
      })();
    }, 350);
    return () => clearTimeout(handle);
  }, [query, open, sourceId]);

  const doMerge = async (target: AdminProductListItem) => {
    setMerging(target.id);
    try {
      const response = await fetch(`/api/admin/products/${sourceId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ into: target.id }),
      });
      if (!response.ok) {
        toast.error(t("mergeError"));
        return;
      }
      toast.success(t("merged"));
      onOpenChange(false);
      router.push(`/portal/admin/products/${target.id}`);
    } finally {
      setMerging(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("mergeTitle")}</DialogTitle>
          <DialogDescription>{t("mergeDescription")}</DialogDescription>
        </DialogHeader>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("mergeSearch")}
        />
        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {query.trim() === "" ? t("mergeHint") : t("mergeNoResults")}
            </p>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                className="bg-background flex items-center gap-2 rounded-md border px-2.5 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.name}
                  </span>
                  {item.brand ? (
                    <span className="text-muted-foreground block truncate text-xs">
                      {item.brand}
                    </span>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={merging !== null}
                  onClick={() => doMerge(item)}
                  className="shrink-0 gap-1.5"
                >
                  {merging === item.id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Merge className="size-3.5" aria-hidden />
                  )}
                  {t("mergeConfirm")}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The new-product intake: choose to start from a barcode (looked up on OpenFoodFacts and imported) or
 * to fill the form in manually. Shown before the form for a brand-new product.
 */
function IntakeChooser({
  barcode,
  onBarcodeChange,
  onLookup,
  onManual,
  loading,
}: {
  barcode: string;
  onBarcodeChange: (value: string) => void;
  onLookup: () => void;
  onManual: () => void;
  loading: boolean;
}) {
  const t = useTranslations("admin.products");
  return (
    <div className="mx-auto max-w-lg space-y-6 py-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">{t("intakeTitle")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("intakeSubtitle")}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ScanBarcode className="size-4" aria-hidden />
          {t("intakeBarcode")}
        </div>
        <p className="text-muted-foreground text-xs">
          {t("intakeBarcodeHint")}
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onLookup();
          }}
          className="flex gap-2"
        >
          <Input
            value={barcode}
            onChange={(event) => onBarcodeChange(event.target.value)}
            placeholder={t("intakeBarcodePlaceholder")}
            inputMode="numeric"
            autoFocus
          />
          <Button
            type="submit"
            disabled={loading || barcode.trim() === ""}
            className="shrink-0 gap-1.5"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ScanBarcode className="size-4" aria-hidden />
            )}
            {t("intakeLookup")}
          </Button>
        </form>
      </div>

      <div className="text-muted-foreground flex items-center gap-3 text-xs">
        <span className="bg-border h-px flex-1" />
        {t("intakeOr")}
        <span className="bg-border h-px flex-1" />
      </div>

      <div className="text-center">
        <Button variant="outline" onClick={onManual} className="gap-1.5">
          <Keyboard className="size-4" aria-hidden />
          {t("intakeManual")}
        </Button>
      </div>
    </div>
  );
}

/** A dashed "add image" tile that opens a file picker. */
/** The dashed "add gallery image" tile — the shared add affordance plus its own hidden file input. */
function ImageUpload({
  label,
  onFile,
  busy,
  className,
}: {
  label: string;
  onFile: (file: File) => void;
  busy: boolean;
  className?: string;
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
      <AddImageTile
        onClick={() => ref.current?.click()}
        label={label}
        busy={busy}
        className={className}
      />
    </>
  );
}

/**
 * A per-SKU image tile: click to upload/replace, with a hover remove control (matching the business
 * media tiles) when a stored image is present.
 */
function ImageThumb({
  url,
  removable,
  onFile,
  onRemove,
  busy,
  uploadLabel,
  removeLabel,
}: {
  url: string | null;
  removable: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
  busy: boolean;
  uploadLabel: string;
  removeLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="group relative shrink-0">
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
        aria-label={uploadLabel}
        className="bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border disabled:opacity-50"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <ImageIcon className="text-muted-foreground size-4" aria-hidden />
        )}
      </button>
      {url && removable ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={removeLabel}
          disabled={busy}
          onClick={onRemove}
          className="absolute -end-1.5 -top-1.5 size-6 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
