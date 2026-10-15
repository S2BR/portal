"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import type { BusinessImage } from "@/app/api/businesses/route";
import { PhotoLightbox } from "@/components/media/photo-lightbox";

/**
 * The business profile photo grid: click a photo to open it full-size in the shared {@link PhotoLightbox}
 * (edge arrows, counter, caption, thumbnail strip). Keeps its own open-index.
 */
export function PhotoGallery({
  images,
  name,
}: {
  images: BusinessImage[];
  name: string;
}) {
  const t = useTranslations("businesses.public");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="focus-visible:ring-ring group overflow-hidden rounded-xl border outline-none focus-visible:ring-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset */}
            <img
              src={image.url}
              alt={t("photoAlt", { name, number: index + 1 })}
              className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      <PhotoLightbox
        images={images}
        openIndex={openIndex}
        onOpenChange={setOpenIndex}
        alt={(index) => t("photoAlt", { name, number: index + 1 })}
        labels={{
          close: t("close"),
          prev: t("prevPhoto"),
          next: t("nextPhoto"),
          goTo: (position) => t("goToPhoto", { number: position }),
        }}
      />
    </>
  );
}
