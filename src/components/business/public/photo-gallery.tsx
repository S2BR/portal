"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import type { BusinessImage } from "@/app/api/businesses/route";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The business profile photo grid with a lightbox — click a photo to open it full-size in a dialog,
 * with prev/next (and a counter) when there's more than one. Keeps its own open-index state.
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
  const count = images.length;

  const step = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null ? null : (current + delta + count) % count,
      ),
    [count],
  );

  // Left/right arrow keys page through the lightbox while it's open.
  useEffect(() => {
    if (openIndex === null || count <= 1) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        step(-1);
      } else if (event.key === "ArrowRight") {
        step(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, count, step]);

  const current = openIndex === null ? null : images[openIndex];

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

      <Dialog
        open={openIndex !== null}
        onOpenChange={(open) => (!open ? setOpenIndex(null) : undefined)}
      >
        <DialogContent
          className="w-fit max-w-none border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-none"
          overlayClassName="bg-black/75"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            {t("photoAlt", { name, number: (openIndex ?? 0) + 1 })}
          </DialogTitle>
          {current ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset */}
              <img
                src={current.url}
                alt={t("photoAlt", { name, number: (openIndex ?? 0) + 1 })}
                className="block h-[85vh] w-auto max-w-[92vw] rounded-xl object-contain shadow-2xl shadow-black/50"
              />
              <DialogClose
                aria-label={t("close")}
                className="bg-background/80 hover:bg-background absolute top-2 right-2 flex size-9 items-center justify-center rounded-full shadow-md backdrop-blur transition-colors"
              >
                <X className="size-5" aria-hidden />
              </DialogClose>
              {count > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label={t("prevPhoto")}
                    onClick={() => step(-1)}
                    className="bg-background/80 hover:bg-background absolute top-1/2 left-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full shadow-md backdrop-blur"
                  >
                    <ChevronLeft className="size-5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={t("nextPhoto")}
                    onClick={() => step(1)}
                    className="bg-background/80 hover:bg-background absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full shadow-md backdrop-blur"
                  >
                    <ChevronRight className="size-5" aria-hidden />
                  </button>
                  <span className="bg-background/80 text-muted-foreground absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-xs tabular-nums backdrop-blur">
                    {(openIndex ?? 0) + 1} / {count}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
