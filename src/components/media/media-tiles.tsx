"use client";

import { ImagePlus, X } from "lucide-react";
import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/** Upload lifecycle for the media affordances — streaming to S3, then the confirm round-trip. */
export type MediaUploadPhase = "idle" | "uploading" | "finalizing";

/** Small inline spinner matching the app's loading affordance. */
export function MediaSpinner() {
  return (
    <span
      aria-hidden
      className="size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current"
    />
  );
}

/** An image preview box, or a neutral placeholder tile when empty. */
export function ImageBox({
  src,
  alt,
  className,
  style,
}: {
  src: string | null;
  alt: string;
  className?: string;
  /** Inline styles for the image (e.g. a banner's `object-position` focal point). */
  style?: CSSProperties;
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
      // Some callers drag the image to reposition it; block the browser's native image-drag ghost.
      draggable={false}
      style={style}
      className={cn("bg-muted border-input border object-cover", className)}
    />
  );
}

/** Progress bar while streaming to S3, then a spinner during the confirm round-trip. */
export function UploadProgress({
  phase,
  progress,
  labels,
}: {
  phase: MediaUploadPhase;
  progress: number;
  labels: { uploading: (percent: number) => string; finalizing: string };
}) {
  return (
    <div role="status" aria-live="polite">
      {phase === "uploading" ? (
        <div className="space-y-1.5">
          <Progress value={progress} />
          <p className="text-muted-foreground text-xs">
            {labels.uploading(progress)}
          </p>
        </div>
      ) : null}
      {phase === "finalizing" ? (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <MediaSpinner />
          {labels.finalizing}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A thumbnail with an overlaid remove control — the shared removable-image tile used by the business
 * gallery and the product editor (gallery + per-SKU images) so they stay visually identical.
 */
export function RemovableImageTile({
  src,
  alt,
  onRemove,
  removeLabel,
  removing = false,
  disabled = false,
  className,
  imageClassName = "aspect-square w-full rounded-lg",
  removeClassName = "end-1.5 top-1.5 size-7",
}: {
  src: string | null;
  alt: string;
  onRemove: () => void;
  removeLabel: string;
  removing?: boolean;
  disabled?: boolean;
  /** Wrapper classes. */
  className?: string;
  /** Sizing/shape of the image box (defaults to a square gallery tile). */
  imageClassName?: string;
  /** Position + size of the remove button. */
  removeClassName?: string;
}) {
  return (
    <div className={cn("group relative", className)}>
      <ImageBox src={src} alt={alt} className={imageClassName} />
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label={removeLabel}
        disabled={disabled}
        onClick={onRemove}
        className={cn("absolute opacity-90 shadow-sm", removeClassName)}
      >
        {removing ? <MediaSpinner /> : <X className="size-4" />}
      </Button>
    </div>
  );
}

/** The dashed "add image(s)" affordance that opens a file picker. */
export function AddImageTile({
  onClick,
  label,
  busy = false,
  className = "aspect-square w-full",
}: {
  onClick: () => void;
  label: string;
  busy?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={cn(
        "border-input text-muted-foreground hover:border-primary hover:text-primary flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs transition-colors disabled:opacity-60",
        className,
      )}
    >
      {busy ? <MediaSpinner /> : <ImagePlus className="size-5" aria-hidden />}
      {label}
    </button>
  );
}
