"use client";

import { ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import type { Business } from "@/app/api/businesses/route";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { normalizeImage } from "@/lib/uploads/image";
import { removeUpload, uploadFile } from "@/lib/uploads/upload";
import { cn } from "@/lib/utils";

type BusinessPayload = { business: Business };

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const GALLERY_MAX = 12;

/** Largest side (px) the browser downscales to before upload, per slot. */
const MAX_SIDE: Record<"logo" | "banner" | "gallery", number> = {
  logo: 512,
  banner: 1600,
  gallery: 1600,
};

type Phase = "idle" | "uploading" | "finalizing";

/** Validate a picked file against the shared image constraints; a message key on failure. */
function rejectReason(file: File): "invalidType" | "tooLarge" | null {
  if (!ACCEPTED.includes(file.type)) {
    return "invalidType";
  }
  if (file.size > MAX_BYTES) {
    return "tooLarge";
  }
  return null;
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
  onUpdated,
}: {
  slug: string;
  kind: "logo" | "banner";
  value: string | null;
  onUpdated: (business: Business) => void;
}) {
  const t = useTranslations("businesses.detail.media");
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  const [preview, setPreviewState] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    },
    [],
  );

  const busy = phase !== "idle" || pending;
  const isLogo = kind === "logo";
  const shown = preview ?? value;
  const maxLabel = `${Math.round(MAX_BYTES / 1024 / 1024)} MB`;

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be re-picked after an error
    if (!file) {
      return;
    }
    setError(null);
    const reason = rejectReason(file);
    if (reason) {
      setError(t(reason));
      return;
    }

    const prepared = await normalizeImage(file, {
      maxSize: MAX_SIDE[kind],
      type: "image/webp",
    });
    setPreview(URL.createObjectURL(prepared));
    setPhase("uploading");
    setProgress(0);

    const result = await uploadFile<BusinessPayload>(
      `business-${kind}`,
      prepared,
      {
        onProgress: setProgress,
        onPhase: setPhase,
        context: { business: slug },
      },
    );

    setPhase("idle");
    setPreview(null);
    if (result.ok && result.data) {
      onUpdated(result.data.business);
      toast.success(t("savedToast"));
    } else {
      toast.error(t("error"));
    }
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

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED.join(",")}
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
                <Spinner />
              ) : (
                <ImagePlus className="size-4" aria-hidden />
              )}
              {shown ? t("replace") : t("upload")}
            </span>
          ) : (
            <span className="bg-background/95 text-foreground flex size-9 scale-90 items-center justify-center rounded-full opacity-0 shadow-sm transition duration-200 ease-out group-hover:scale-100 group-hover:opacity-100">
              {phase !== "idle" ? (
                <Spinner />
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
          {pending ? <Spinner /> : <X className="size-4" />}
        </Button>
      ) : null}
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
          {imageBlock({
            wrapperClassName: "",
            buttonClassName: "aspect-[16/6] w-full",
            withLabel: true,
            removeClassName: "end-2 top-2 size-7",
          })}
          {hint}
        </div>
      )}

      <UploadStatus phase={phase} progress={progress} />
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
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

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gallery = images ?? [];
  const busy = phase !== "idle" || removingId !== null;
  const full = gallery.length >= GALLERY_MAX;
  const maxLabel = `${Math.round(MAX_BYTES / 1024 / 1024)} MB`;

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) {
      return;
    }
    setError(null);

    let uploaded = 0;
    for (const file of files) {
      if (rejectReason(file)) {
        setError(t(rejectReason(file) as "invalidType" | "tooLarge"));
        continue;
      }
      const prepared = await normalizeImage(file, {
        maxSize: MAX_SIDE.gallery,
        type: "image/webp",
      });
      setPhase("uploading");
      setProgress(0);
      const result = await uploadFile<BusinessPayload>(
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

  async function remove(imageId: number) {
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

  return (
    <div className="space-y-3">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {t("galleryTitle")}
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {gallery.map((image) => (
          <div key={image.id} className="group relative">
            <ImageBox
              src={image.url}
              alt={t("galleryTitle")}
              className="aspect-square w-full rounded-lg"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={t("remove")}
              disabled={busy}
              onClick={() => remove(image.id)}
              className="absolute end-1.5 top-1.5 size-7 opacity-90 shadow-sm"
            >
              {removingId === image.id ? <Spinner /> : <X className="size-4" />}
            </Button>
          </div>
        ))}

        {!full ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="border-input text-muted-foreground hover:border-primary hover:text-primary flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs transition-colors disabled:opacity-60"
          >
            {phase !== "idle" ? (
              <Spinner />
            ) : (
              <ImagePlus className="size-5" aria-hidden />
            )}
            {t("addImages")}
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        className="hidden"
        onChange={onFileChange}
      />

      <p className="text-muted-foreground text-xs">
        {t("galleryHint")} · {t("constraints", { max: maxLabel })}
      </p>

      <UploadStatus phase={phase} progress={progress} />
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** An image preview box, or a neutral placeholder tile when empty. */
function ImageBox({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "bg-muted text-muted-foreground flex items-center justify-center",
          className,
        )}
        aria-hidden
      >
        <ImagePlus className="size-5" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- presigned S3 / local object URL, not a bundled asset
    <img
      src={src}
      alt={alt}
      className={cn("bg-muted border-input border object-cover", className)}
    />
  );
}

/** Progress bar while streaming to S3, then a spinner during the confirm round-trip. */
function UploadStatus({ phase, progress }: { phase: Phase; progress: number }) {
  const t = useTranslations("businesses.detail.media");
  return (
    <div role="status" aria-live="polite">
      {phase === "uploading" ? (
        <div className="space-y-1.5">
          <Progress value={progress} />
          <p className="text-muted-foreground text-xs">
            {t("uploading", { percent: progress })}
          </p>
        </div>
      ) : null}
      {phase === "finalizing" ? (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <Spinner />
          {t("finalizing")}
        </p>
      ) : null}
    </div>
  );
}

/** Small inline spinner matching the app's loading affordance. */
function Spinner() {
  return (
    <span
      aria-hidden
      className="size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current"
    />
  );
}
