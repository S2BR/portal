"use client";

import { useTranslations } from "next-intl";
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

interface AvatarCropDialogProps {
  /** The object URL of the picked image, or null when the dialog is closed. */
  src: string | null;
  /** The picked file — the crop is applied to this and returned. */
  file: File | null;
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
 * A square (circular-masked) crop dialog. Opens when a file is picked; on confirm it maps the
 * on-screen selection to the image's natural pixels and hands back a cropped, re-encoded file.
 */
export function AvatarCropDialog({
  src,
  file,
  onCancel,
  onCropped,
}: AvatarCropDialogProps) {
  const t = useTranslations("avatarSettings");
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
          <DialogTitle>{t("cropTitle")}</DialogTitle>
          <DialogDescription>{t("cropHint")}</DialogDescription>
        </DialogHeader>

        {src ? (
          <div className="flex justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(pixelCrop) => setCompleted(pixelCrop)}
              aspect={1}
              circularCrop
              keepSelection
              className="max-h-[60vh]"
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
            {t("cropCancel")}
          </Button>
          <Button onClick={confirm} disabled={working || !completed}>
            {t("cropConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
