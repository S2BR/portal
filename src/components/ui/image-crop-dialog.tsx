"use client";

import { useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop as RicPixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cropImage, type PixelCrop } from "@/lib/uploads/image";
import { cn } from "@/lib/utils";

export interface CropLabels {
  title: string;
  hint: string;
  cancel: string;
  confirm: string;
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
  labels: CropLabels;
  onCancel: () => void;
  onCropped: (file: File) => void;
}

/** Center a square crop covering ~90% of the image. */
function centeredSquare(width: number, height: number): Crop {
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
  labels,
  onCancel,
  onCropped,
}: ImageCropDialogProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<RicPixelCrop>();
  const [working, setWorking] = useState(false);

  const open = src !== null && file !== null;

  function onImageLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = event.currentTarget;
    setCrop(centeredSquare(width, height));
  }

  async function confirm() {
    const image = imageRef.current;
    if (!image || !completed || !file) {
      return;
    }
    // Selection is in displayed pixels; scale to the image's natural resolution.
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixels: PixelCrop = {
      x: completed.x * scaleX,
      y: completed.y * scaleY,
      width: completed.width * scaleX,
      height: completed.height * scaleY,
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
          <div className="flex justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(pixelCrop) => setCompleted(pixelCrop)}
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
                className="max-h-[60vh] w-auto"
              />
            </ReactCrop>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={working}>
            {labels.cancel}
          </Button>
          <Button onClick={confirm} disabled={working || !completed}>
            {labels.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
