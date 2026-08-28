"use client";

import { ImagePlus, Move, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { toast } from "sonner";

import type { BannerFocal, Business } from "@/app/api/businesses/route";
import {
  AddImageTile,
  ImageBox,
  MediaSpinner,
  RemovableImageTile,
  UploadProgress,
  type MediaUploadPhase,
} from "@/components/media/media-tiles";
import { Button } from "@/components/ui/button";
import { DragHandle, overlayClass } from "@/components/ui/drag-handle";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { SortableList } from "@/components/ui/sortable-list";
import {
  CENTER_FOCAL,
  clampFocal,
  focalObjectPosition,
} from "@/lib/banner-focal";
import { normalizeImage } from "@/lib/uploads/image";
import {
  fetchUploadConfig,
  removeUpload,
  upload,
  type UploadConfig,
} from "@/lib/uploads/upload";
import { cn } from "@/lib/utils";

type BusinessPayload = { business: Business };

/** Largest side (px) the browser downscales to before upload, per slot. */
const MAX_SIDE: Record<"logo" | "banner" | "gallery", number> = {
  logo: 512,
  banner: 1600,
  gallery: 1600,
};

/**
 * Validate a picked file against the type's limits FROM THE API (nothing hardcoded); a message key on
 * failure. Until the config has loaded it lets the file through — the API re-enforces on upload.
 */
function rejectReason(
  file: File,
  config: UploadConfig | null,
): "invalidType" | "tooLarge" | null {
  if (!config) {
    return null;
  }
  if (!config.mime_types.includes(file.type)) {
    return "invalidType";
  }
  if (file.size > config.max_bytes) {
    return "tooLarge";
  }
  return null;
}

/** Human size label for a byte cap (e.g. "5 MB"), or empty until the config has loaded. */
function maxLabelFor(config: UploadConfig | null): string {
  return config ? `${Math.round(config.max_bytes / 1024 / 1024)} MB` : "";
}

/**
 * Upload / replace / remove a single business image slot (logo or banner). The picked file is
 * downscaled + re-encoded to WebP in the browser (stripping EXIF, incl. GPS) and shown as an
 * optimistic preview while it streams straight to S3. Immediate — not part of the edit form.
 */
export function BusinessImageField({
  slug,
  kind,
  value,
  focal: focalProp = null,
  onUpdated,
  basePath = "/api/businesses",
}: {
  slug: string;
  kind: "logo" | "banner";
  value: string | null;
  /** The banner's stored focal point (object-position); ignored for the logo. */
  focal?: BannerFocal | null;
  onUpdated: (business: Business) => void;
  /** BFF base for the focal-point PATCH — owner default; the admin editor passes its own. */
  basePath?: string;
}) {
  const t = useTranslations("businesses.detail.media");
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  const [preview, setPreviewState] = useState<string | null>(null);
  const [phase, setPhase] = useState<MediaUploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<UploadConfig | null>(null);

  // Accepted types + size cap come from the API (source of truth), so nothing here is hardcoded.
  useEffect(() => {
    void fetchUploadConfig(`business-${kind}`).then(setConfig);
  }, [kind]);

  // Banner focal point. Reposition is a deliberate mode (entered from a hover button) so a stray
  // click or drag can't disturb the banner. `dragFocal` is a live override while dragging (and until
  // the save lands), so the drag can't be reset by an unrelated re-render; else stored `focalProp` wins.
  const [repositionMode, setRepositionMode] = useState(false);
  const [dragFocal, setDragFocal] = useState<BannerFocal | null>(null);
  const [repositioning, setRepositioning] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startFocal: BannerFocal;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);

  // The logo is square-cropped before upload; this holds the picked file while the crop dialog is open.
  const cropUrlRef = useRef<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const closeCrop = () => {
    if (cropUrlRef.current) {
      URL.revokeObjectURL(cropUrlRef.current);
      cropUrlRef.current = null;
    }
    setCropSrc(null);
    setCropFile(null);
  };

  const setPreview = (url: string | null) => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = url;
    setPreviewState(url);
  };

  useEffect(
    () => () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
      if (cropUrlRef.current) {
        URL.revokeObjectURL(cropUrlRef.current);
      }
    },
    [],
  );

  const busy = phase !== "idle" || pending;
  const isLogo = kind === "logo";
  const shown = preview ?? value;
  const maxLabel = maxLabelFor(config);
  const focal = dragFocal ?? focalProp ?? CENTER_FOCAL;

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be re-picked after an error
    if (!file) {
      return;
    }
    setError(null);
    const reason = rejectReason(file, config);
    if (reason) {
      setError(t(reason));
      return;
    }

    // The logo is a fixed square — let the owner frame it in a crop dialog before upload. The banner
    // is wide, so it uploads downscaled as-is; the owner then drags it to set the focal point.
    if (isLogo) {
      const url = URL.createObjectURL(file);
      cropUrlRef.current = url;
      setCropSrc(url);
      setCropFile(file);
      return;
    }

    const prepared = await normalizeImage(file, {
      maxSize: MAX_SIDE[kind],
      type: "image/webp",
    });
    await runUpload(prepared);
  }

  // Upload an already-prepared (downscaled/cropped, WebP) file with an optimistic preview + toasts.
  async function runUpload(prepared: File) {
    setPreview(URL.createObjectURL(prepared));
    setPhase("uploading");
    setProgress(0);

    const result = await upload<BusinessPayload>(`business-${kind}`, prepared, {
      onProgress: setProgress,
      onPhase: setPhase,
      context: { business: slug },
    });

    setPhase("idle");
    setPreview(null);
    if (result.ok && result.data) {
      onUpdated(result.data.business);
      toast.success(t("savedToast"));
    } else {
      toast.error(t("error"));
    }
  }

  async function onCropped(prepared: File) {
    closeCrop();
    await runUpload(prepared);
  }

  async function remove() {
    setPending(true);
    const result = await removeUpload<BusinessPayload>(`business-${kind}`, {
      business: slug,
    });
    setPending(false);
    if (result.ok && result.data) {
      onUpdated(result.data.business);
      toast.success(t("removedToast"));
    } else {
      toast.error(t("error"));
    }
  }

  // Persist the banner focal point via the business PATCH, then hand display back to the (now
  // updated, or on failure unchanged) `focalProp`. `dragFocal` holds the value across the round-trip.
  async function saveFocal(next: BannerFocal) {
    const response = await fetch(`${basePath}/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banner_focal: next }),
    });
    const data = response.ok
      ? ((await response.json().catch(() => null)) as {
          business?: Business;
        } | null)
      : null;
    if (data?.business) {
      onUpdated(data.business);
    } else {
      toast.error(t("error"));
    }
    setDragFocal(null);
  }

  function resetFocal() {
    setDragFocal(CENTER_FOCAL);
    void saveFocal(CENTER_FOCAL);
  }

  /** Map a pointer delta to a new focal point — dragging the image reveals the opposite edge. */
  function focalFromDelta(
    drag: NonNullable<typeof dragRef.current>,
    clientX: number,
    clientY: number,
  ): BannerFocal {
    return {
      x: Math.round(
        clampFocal(
          drag.startFocal.x - ((clientX - drag.startX) / drag.width) * 100,
        ),
      ),
      y: Math.round(
        clampFocal(
          drag.startFocal.y - ((clientY - drag.startY) / drag.height) * 100,
        ),
      ),
    };
  }

  function onBannerPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    // Let the in-mode controls (Done / Reset) be clicked without starting a drag.
    if (busy || (event.target as HTMLElement).closest("button")) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startFocal: focal,
      width: rect.width,
      height: rect.height,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onBannerPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    // Ignore sub-pixel jitter before committing to a drag.
    if (
      !drag.moved &&
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 4
    ) {
      return;
    }
    drag.moved = true;
    if (!repositioning) {
      setRepositioning(true);
    }
    setDragFocal(focalFromDelta(drag, event.clientX, event.clientY));
  }

  function onBannerPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    setRepositioning(false);
    if (!drag) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!drag.moved) {
      return;
    }
    const next = focalFromDelta(drag, event.clientX, event.clientY);
    setDragFocal(next);
    void saveFocal(next);
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={config?.mime_types.join(",")}
      className="hidden"
      onChange={onFileChange}
    />
  );

  const hint = (
    <p className="text-muted-foreground text-xs">
      {isLogo ? t("logoHint") : t("bannerHint")} ·{" "}
      {t("constraints", { max: maxLabel })}
    </p>
  );

  // One interactive block for both slots: click to upload/replace, with a hover overlay + gentle
  // zoom (like the gallery tiles) and a remove control that fades in on hover. The banner is wide and
  // shows a labeled pill; the compact logo square shows an icon-only badge.
  const imageBlock = (options: {
    wrapperClassName: string;
    buttonClassName: string;
    withLabel: boolean;
    removeClassName: string;
  }) => (
    <div className={cn("group relative", options.wrapperClassName)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        aria-label={shown ? t("replace") : t("upload")}
        className={cn(
          "focus-visible:ring-ring focus-visible:ring-offset-background relative block overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed",
          options.buttonClassName,
        )}
      >
        <ImageBox
          src={shown}
          alt={isLogo ? t("logoTitle") : t("bannerTitle")}
          className="size-full rounded-xl transition-transform duration-300 ease-out group-hover:scale-[1.04]"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/40">
          {options.withLabel ? (
            <span className="bg-background/95 text-foreground flex translate-y-1 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium opacity-0 shadow-sm transition duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100">
              {phase !== "idle" ? (
                <MediaSpinner />
              ) : (
                <ImagePlus className="size-4" aria-hidden />
              )}
              {shown ? t("replace") : t("upload")}
            </span>
          ) : (
            <span className="bg-background/95 text-foreground flex size-9 scale-90 items-center justify-center rounded-full opacity-0 shadow-sm transition duration-200 ease-out group-hover:scale-100 group-hover:opacity-100">
              {phase !== "idle" ? (
                <MediaSpinner />
              ) : (
                <ImagePlus className="size-4" aria-hidden />
              )}
            </span>
          )}
        </span>
      </button>
      {shown ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={t("remove")}
          disabled={busy}
          onClick={remove}
          className={cn(
            "absolute opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100",
            options.removeClassName,
          )}
        >
          {pending ? <MediaSpinner /> : <X className="size-4" />}
        </Button>
      ) : null}
    </div>
  );

  // The banner-with-image state. Replace and Reposition are explicit hover buttons (a stray click on
  // the image does nothing), and repositioning is a deliberate mode: the image is dragged to set the
  // focal point and auto-saves on release, with Reset and Done controls.
  const bannerPreview = (
    <div
      className={cn(
        "group border-input relative aspect-[16/6] w-full overflow-hidden rounded-xl border",
        repositionMode &&
          "ring-primary ring-offset-background ring-2 ring-offset-2",
      )}
      onPointerDown={repositionMode ? onBannerPointerDown : undefined}
      onPointerMove={repositionMode ? onBannerPointerMove : undefined}
      onPointerUp={repositionMode ? onBannerPointerUp : undefined}
    >
      <ImageBox
        src={shown}
        alt={t("bannerTitle")}
        style={{ objectPosition: focalObjectPosition(focal) }}
        className={cn(
          "size-full rounded-xl",
          repositionMode &&
            (repositioning
              ? "cursor-grabbing touch-none"
              : "cursor-grab touch-none"),
        )}
      />

      {repositionMode ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-8">
            <span className="text-xs font-medium text-white">
              {t("repositionHint")}
            </span>
          </div>
          <div className="absolute end-2 top-2 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={resetFocal}
              disabled={busy}
            >
              {t("resetFocal")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setRepositionMode(false)}
            >
              {t("done")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition duration-200 group-hover:bg-black/40 group-hover:opacity-100">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {phase !== "idle" ? (
                <MediaSpinner />
              ) : (
                <ImagePlus className="size-4" aria-hidden />
              )}
              {t("replace")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setRepositionMode(true)}
              disabled={busy}
            >
              <Move className="size-4" aria-hidden />
              {t("reposition")}
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={t("remove")}
            disabled={busy}
            onClick={remove}
            className="absolute end-2 top-2 size-7 opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100"
          >
            {pending ? <MediaSpinner /> : <X className="size-4" />}
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {isLogo ? t("logoTitle") : t("bannerTitle")}
      </h3>

      {fileInput}

      {isLogo ? (
        <div className="flex items-center gap-4">
          {imageBlock({
            wrapperClassName: "shrink-0",
            buttonClassName: "size-24",
            withLabel: false,
            removeClassName: "end-1.5 top-1.5 size-6",
          })}
          {hint}
        </div>
      ) : (
        <div className="space-y-2">
          {shown
            ? bannerPreview
            : imageBlock({
                wrapperClassName: "",
                buttonClassName: "aspect-[16/6] w-full",
                withLabel: true,
                removeClassName: "end-2 top-2 size-7",
              })}
          {hint}
        </div>
      )}

      <UploadProgress
        phase={phase}
        progress={progress}
        labels={{
          uploading: (percent) => t("uploading", { percent }),
          finalizing: t("finalizing"),
        }}
      />
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      {/* Square crop with a rounded-square mask preview (never opens for the banner). */}
      <ImageCropDialog
        mask="rounded"
        src={cropSrc}
        file={cropFile}
        onCancel={closeCrop}
        onCropped={onCropped}
        labels={{
          title: t("cropTitle"),
          hint: t("cropHint"),
          cancel: t("cropCancel"),
          confirm: t("cropConfirm"),
        }}
      />
    </div>
  );
}

/**
 * The business's gallery: a grid of images each with a remove control, plus an add tile that
 * uploads picked files one after another (each downscaled + re-encoded to WebP in the browser).
 */
export function BusinessGallery({
  slug,
  images,
  onUpdated,
}: {
  slug: string;
  images: Business["images"];
  onUpdated: (business: Business) => void;
}) {
  const t = useTranslations("businesses.detail.media");
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<MediaUploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<UploadConfig | null>(null);

  // Accepted types, size cap, and the image count cap all come from the API (source of truth).
  useEffect(() => {
    void fetchUploadConfig("business-gallery").then(setConfig);
  }, []);

  // A local copy so a drag reorder can apply optimistically; kept in sync with the prop.
  const [gallery, setGallery] = useState<NonNullable<Business["images"]>>(
    images ?? [],
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGallery(images ?? []);
  }, [images]);
  const busy = phase !== "idle" || removingId !== null;
  // Until the config loads, don't cap (add stays available); the API enforces the real limit.
  const full = config != null && gallery.length >= (config.max_files ?? 0);
  const maxLabel = maxLabelFor(config);

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }
    setError(null);

    let uploaded = 0;
    for (const file of files) {
      const reason = rejectReason(file, config);
      if (reason) {
        setError(t(reason));
        continue;
      }
      const prepared = await normalizeImage(file, {
        maxSize: MAX_SIDE.gallery,
        type: "image/webp",
      });
      setPhase("uploading");
      setProgress(0);
      const result = await upload<BusinessPayload>(
        "business-gallery",
        prepared,
        {
          onProgress: setProgress,
          onPhase: setPhase,
          context: { business: slug },
        },
      );
      setPhase("idle");
      if (result.ok && result.data) {
        onUpdated(result.data.business);
        uploaded += 1;
      } else {
        toast.error(t("error"));
        break;
      }
    }
    if (uploaded > 0) {
      toast.success(t("savedToast"));
    }
  }

  async function remove(imageId: string) {
    setRemovingId(imageId);
    const result = await removeUpload<BusinessPayload>("business-gallery", {
      business: slug,
      image: imageId,
    });
    setRemovingId(null);
    if (result.ok && result.data) {
      onUpdated(result.data.business);
    } else {
      toast.error(t("error"));
    }
  }

  async function reorder(next: NonNullable<Business["images"]>) {
    const previous = gallery;
    setGallery(next); // optimistic
    const response = await fetch(
      `/api/businesses/${encodeURIComponent(slug)}/images`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((image) => image.id) }),
      },
    );
    if (!response.ok) {
      setGallery(previous); // rollback
      toast.error(t("error"));
      return;
    }
    const data = (await response.json().catch(() => null)) as {
      business?: Business;
    } | null;
    if (data?.business) {
      onUpdated(data.business);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {t("galleryTitle")}
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SortableList
          items={gallery}
          getId={(image) => image.id}
          onReorder={reorder}
          strategy="rect"
          className="contents"
          renderOverlay={(image) => (
            <div className={cn("overflow-hidden rounded-lg", overlayClass)}>
              <ImageBox
                src={image.url}
                alt={t("galleryTitle")}
                className="aspect-square w-full"
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
                alt={t("galleryTitle")}
                onRemove={() => remove(image.id)}
                removeLabel={t("remove")}
                removing={removingId === image.id}
                disabled={busy}
              />
              {gallery.length > 1 ? (
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

        {!full ? (
          <AddImageTile
            onClick={() => inputRef.current?.click()}
            label={t("addImages")}
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
        {t("galleryHint")} · {t("constraints", { max: maxLabel })}
      </p>

      <UploadProgress
        phase={phase}
        progress={progress}
        labels={{
          uploading: (percent) => t("uploading", { percent }),
          finalizing: t("finalizing"),
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
