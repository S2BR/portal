"use client";

import { useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PercentCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

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
import { cropImage, fitImage, type PixelCrop } from "@/lib/uploads/image";
import { cn } from "@/lib/utils";

export interface CropLabels {
  title: string;
  hint: string;
  cancel: string;
  confirm: string;
  /** "The image doesn't fit — keep it whole" toggle (only shown when `allowFit`). */
  fit?: string;
  background?: string;
  transparent?: string;
  /** Label for the padding slider shown in fit mode. */
  padding?: string;
}

/**
 * The on-screen mask shape — a PREVIEW of how the image will display. The crop (and the stored file)
 * is always a square; "circle" masks it round (avatars), "rounded" masks it as a squircle (logos).
 */
type CropMask = "circle" | "rounded" | "square";

interface ImageCropDialogProps {
  /** The object URL of the picked image, or null when the dialog is closed. */
  src: string | null;
  /** The picked file — the crop is applied to it and returned re-encoded. */
  file: File | null;
  mask?: CropMask;
  /** Offer a "keep the whole image + pad a background" alternative to cropping (for non-square logos). */
  allowFit?: boolean;
  labels: CropLabels;
  onCancel: () => void;
  onCropped: (file: File) => void;
}

/**
 * The classic "transparency" checkerboard, shown BEHIND the image so any transparent areas of a PNG
 * read as clear (not as an opaque fill). Opaque images simply cover it.
 */
const CHECKERBOARD: React.CSSProperties = {
  backgroundColor: "#fff",
  backgroundImage:
    "conic-gradient(#d1d5db 0 25%, transparent 0 50%, #d1d5db 0 75%, transparent 0)",
  backgroundSize: "16px 16px",
};

/** Center a square crop covering ~90% of the image. */
function centeredSquare(width: number, height: number): PercentCrop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, 1, width, height),
    width,
    height,
  );
}

/**
 * A square crop dialog for a fixed-shape image (avatar / logo). Opens when a file is picked; on
 * confirm it maps the on-screen selection to the image's natural pixels and hands back a cropped,
 * re-encoded file. `circular` only changes the on-screen mask — the output is always a square.
 */
export function ImageCropDialog({
  src,
  file,
  mask = "square",
  allowFit = false,
  labels,
  onCancel,
  onCropped,
}: ImageCropDialogProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  // Store the completed crop as PERCENTages, not pixels: it's resolution-independent and is exactly
  // what the gray mask is drawn from, so the output can't drift from what the mask showed.
  const [completed, setCompleted] = useState<PercentCrop>();
  const [working, setWorking] = useState(false);
  // "Keep the whole image" — fit it into the square and pad the rest with a background.
  const [fit, setFit] = useState(false);
  const [transparent, setTransparent] = useState(true);
  const [background, setBackground] = useState("#ffffff");
  // Inset on each side, as a fraction of the square, so the logo doesn't touch the edges.
  const [padding, setPadding] = useState(0.05);

  const open = src !== null && file !== null;
  const effectiveBackground = transparent ? "transparent" : background;

  function onImageLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = event.currentTarget;
    const initial = centeredSquare(width, height);
    setCrop(initial);
    // Seed the completed crop too, so the default (centered) framing is usable without a nudge.
    setCompleted(initial);
  }

  async function confirm() {
    if (!file) {
      return;
    }

    // Fit mode: keep the whole image, padded into the square with the chosen background.
    if (fit) {
      setWorking(true);
      const fitted = await fitImage(file, effectiveBackground, padding);
      setWorking(false);
      onCropped(fitted);
      return;
    }

    const image = imageRef.current;
    if (!image || !completed) {
      return;
    }
    // The selection is a percentage of the image, so it maps to natural pixels directly — no dependency
    // on the (rounded, sometimes mid-animation) displayed size, which is what made the crop drift.
    const pixels: PixelCrop = {
      x: (completed.x / 100) * image.naturalWidth,
      y: (completed.y / 100) * image.naturalHeight,
      width: (completed.width / 100) * image.naturalWidth,
      height: (completed.height / 100) * image.naturalHeight,
    };

    setWorking(true);
    const cropped = await cropImage(file, pixels);
    setWorking(false);
    onCropped(cropped);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onCancel())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.hint}</DialogDescription>
        </DialogHeader>

        {src ? (
          fit ? (
            // Fit preview: the whole image contained in the square, padded with the chosen background.
            <div className="flex justify-center">
              <div
                className={cn(
                  "relative aspect-square w-64 max-w-full overflow-hidden border",
                  mask === "circle"
                    ? "rounded-full"
                    : mask === "rounded"
                      ? "rounded-3xl"
                      : "rounded-md",
                )}
                style={transparent ? CHECKERBOARD : { background }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not a remote asset */}
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 size-full object-contain"
                  style={{
                    padding: `${padding * 100}%`,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(_, percentCrop) => setCompleted(percentCrop)}
                aspect={1}
                circularCrop={mask === "circle"}
                keepSelection
                // `ReactCrop--no-animate` drops the straight-edge marching-ants (they can't follow a
                // rounded/circular mask); globals.css restyles the outline into a shape-following dashed
                // border. `crop-rounded` previews a squircle for logos by rounding the SVG mask hole.
                className={cn(
                  "ReactCrop--no-animate max-h-[60vh]",
                  mask === "rounded" && "crop-rounded",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not a remote asset */}
                <img
                  ref={imageRef}
                  src={src}
                  alt=""
                  onLoad={onImageLoad}
                  // Checkerboard behind the image so a transparent PNG reads as clear while cropping;
                  // an opaque image covers it entirely.
                  style={CHECKERBOARD}
                  className="max-h-[60vh] w-auto"
                />
              </ReactCrop>
            </div>
          )
        ) : null}

        {allowFit ? (
          <div className="space-y-3">
            <label className="flex items-center gap-2.5 text-sm font-medium">
              <Checkbox
                checked={fit}
                onCheckedChange={(value) => setFit(value === true)}
              />
              {labels.fit}
            </label>
            {fit ? (
              <div className="space-y-3 ps-6">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={transparent}
                      onCheckedChange={(value) =>
                        setTransparent(value === true)
                      }
                    />
                    {labels.transparent}
                  </label>
                  {/* The background color only matters when it isn't transparent. */}
                  {!transparent ? (
                    <>
                      <span className="text-muted-foreground text-sm">
                        {labels.background}
                      </span>
                      <input
                        type="color"
                        value={background}
                        onChange={(event) => setBackground(event.target.value)}
                        aria-label={labels.background}
                        className="h-8 w-10 cursor-pointer rounded border bg-transparent"
                      />
                    </>
                  ) : null}
                </div>
                {labels.padding ? (
                  <label className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {labels.padding}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={35}
                      step={1}
                      value={Math.round(padding * 100)}
                      onChange={(event) =>
                        setPadding(Number(event.target.value) / 100)
                      }
                      aria-label={labels.padding}
                      className="accent-primary h-1.5 flex-1 cursor-pointer"
                    />
                    <span className="text-muted-foreground w-9 text-right tabular-nums">
                      {Math.round(padding * 100)}%
                    </span>
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={working}>
            {labels.cancel}
          </Button>
          <Button onClick={confirm} disabled={working || (!fit && !completed)}>
            {labels.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
