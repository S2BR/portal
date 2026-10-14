"use client";

import { Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  AddImageTile,
  ImageBox,
  MediaSpinner,
  UploadProgress,
  type MediaUploadPhase,
} from "@/components/media/media-tiles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchUploadConfig,
  removeUpload,
  upload,
  type UploadConfig,
} from "@/lib/uploads/upload";
import { normalizeImage } from "@/lib/uploads/image";
import type { AdImage, MarketplaceAd } from "@/lib/marketplace/types";

const UPLOAD_TYPE = "marketplace-ad-image";
const MAX_SIDE = 1600;

/** Manage an ad's photos: add (normalized → presigned upload), remove, and set the cover (reorder). */
export function AdPhotos({ ad }: { ad: MarketplaceAd }) {
  const t = useTranslations("marketplace");
  const [images, setImages] = useState<AdImage[]>(ad.images);
  const [config, setConfig] = useState<UploadConfig | null>(null);
  const [phase, setPhase] = useState<MediaUploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [acting, setActing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchUploadConfig(UPLOAD_TYPE).then(setConfig);
  }, []);

  const uploading = phase !== "idle";
  const atMax = config?.max_files != null && images.length >= config.max_files;

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (config && !config.mime_types.includes(file.type)) {
      toast.error(t("photos.invalidType"));
      return;
    }
    setPhase("uploading");
    setProgress(0);
    try {
      const prepared = await normalizeImage(file, {
        maxSize: MAX_SIDE,
        type: "image/webp",
      });
      const result = await upload<{ ad: MarketplaceAd }>(
        UPLOAD_TYPE,
        prepared,
        {
          context: { ad: ad.slug },
          onProgress: setProgress,
          onPhase: setPhase,
        },
      );
      if (result.ok && result.data) {
        setImages(result.data.ad.images);
        toast.success(t("photos.added"));
      } else {
        toast.error(t("photos.error"));
      }
    } catch {
      toast.error(t("photos.error"));
    } finally {
      setPhase("idle");
    }
  }

  async function remove(imageId: string) {
    setActing(imageId);
    const previous = images;
    setImages((current) => current.filter((image) => image.id !== imageId));
    try {
      const result = await removeUpload<{ ad: MarketplaceAd }>(UPLOAD_TYPE, {
        ad: ad.slug,
        image: imageId,
      });
      if (result.ok && result.data) {
        setImages(result.data.ad.images);
      } else {
        setImages(previous);
        toast.error(t("photos.error"));
      }
    } catch {
      setImages(previous);
      toast.error(t("photos.error"));
    } finally {
      setActing(null);
    }
  }

  async function makeCover(imageId: string) {
    const ids = [
      imageId,
      ...images.filter((image) => image.id !== imageId).map((i) => i.id),
    ];
    const previous = images;
    setActing(imageId);
    setImages((current) =>
      [...current].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)),
    );
    try {
      const res = await fetch(
        `/api/marketplace/ads/${ad.slug}/images/reorder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        },
      );
      const data = (await res.json()) as { ad?: MarketplaceAd };
      if (res.ok && data.ad) {
        setImages(data.ad.images);
      } else {
        setImages(previous);
        toast.error(t("photos.error"));
      }
    } catch {
      setImages(previous);
      toast.error(t("photos.error"));
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((image, index) => (
          <div key={image.id} className="group relative">
            <ImageBox
              src={image.url}
              alt=""
              className="aspect-square w-full rounded-lg"
            />
            {index === 0 ? (
              <Badge variant="green" className="absolute start-1.5 top-1.5">
                {t("photos.cover")}
              </Badge>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label={t("photos.makeCover")}
                disabled={acting !== null}
                onClick={() => void makeCover(image.id)}
                className="absolute start-1.5 top-1.5 size-7 opacity-0 shadow-sm transition-opacity group-hover:opacity-90"
              >
                {acting === image.id ? (
                  <MediaSpinner />
                ) : (
                  <Star className="size-4" />
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label={t("photos.remove")}
              disabled={acting !== null}
              onClick={() => void remove(image.id)}
              className="absolute end-1.5 top-1.5 size-7 opacity-90 shadow-sm"
            >
              {acting === image.id ? (
                <MediaSpinner />
              ) : (
                <X className="size-4" />
              )}
            </Button>
          </div>
        ))}

        {!atMax ? (
          <AddImageTile
            onClick={() => fileRef.current?.click()}
            label={t("photos.add")}
            busy={uploading}
          />
        ) : null}
      </div>

      {uploading ? (
        <UploadProgress
          phase={phase}
          progress={progress}
          labels={{
            uploading: (percent) => t("photos.uploading", { percent }),
            finalizing: t("photos.finalizing"),
          }}
        />
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPick}
      />
      <p className="text-muted-foreground text-xs">{t("photos.hint")}</p>
    </div>
  );
}
