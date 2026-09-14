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
import { cn } from "@/lib/utils";

/**
 * The business profile photo grid with a lightbox — click a photo to open it full-size in a dialog.
 * The lightbox has edge arrows, a position counter, the image's caption below it, and a thumbnail
 * strip where the non-current thumbs are faded and clicking one jumps to it. Keeps its own open-index.
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
          // Fill the viewport (no centering transform) so the arrows can pin to the SCREEN edges;
          // the image column is centered inside. Clicking the empty backdrop closes it.
          className="fixed inset-0 z-50 flex max-w-none translate-x-0 translate-y-0 items-center justify-center border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-none"
          overlayClassName="bg-black/75"
          showCloseButton={false}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOpenIndex(null);
            }
          }}
        >
          <DialogTitle className="sr-only">
            {t("photoAlt", { name, number: (openIndex ?? 0) + 1 })}
          </DialogTitle>
          {current ? (
            <>
              <DialogClose
                aria-label={t("close")}
                className="bg-background/80 hover:bg-background absolute top-4 right-4 z-10 flex size-9 items-center justify-center rounded-full shadow-md backdrop-blur transition-colors"
              >
                <X className="size-5" aria-hidden />
              </DialogClose>

              {count > 1 ? (
                <>
                  {/* Arrows pinned to the left/right edges of the screen. */}
                  <button
                    type="button"
                    aria-label={t("prevPhoto")}
                    onClick={() => step(-1)}
                    className="bg-background/80 hover:bg-background absolute top-1/2 left-2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md backdrop-blur transition-colors"
                  >
                    <ChevronLeft className="size-5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={t("nextPhoto")}
                    onClick={() => step(1)}
                    className="bg-background/80 hover:bg-background absolute top-1/2 right-2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md backdrop-blur transition-colors"
                  >
                    <ChevronRight className="size-5" aria-hidden />
                  </button>
                </>
              ) : null}

              {/* The centered image column: image (+ counter), caption, thumbnails. */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset */}
                  <img
                    src={current.url}
                    alt={t("photoAlt", { name, number: (openIndex ?? 0) + 1 })}
                    className="block h-[72vh] w-auto max-w-[92vw] rounded-xl object-contain shadow-2xl shadow-black/50"
                  />
                  {count > 1 ? (
                    <span className="bg-background/80 text-muted-foreground absolute top-2 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-xs tabular-nums backdrop-blur">
                      {(openIndex ?? 0) + 1} / {count}
                    </span>
                  ) : null}
                </div>

                {/* Caption below the image, when the owner set one. */}
                {current.caption ? (
                  <p className="bg-background/80 max-w-[92vw] rounded-full px-3 py-1 text-center text-sm backdrop-blur">
                    {current.caption}
                  </p>
                ) : null}

                {/* Thumbnail strip — current fully opaque + ringed, the rest faded; all clickable. */}
                {count > 1 ? (
                  <div className="flex max-w-[92vw] gap-2 overflow-x-auto p-1.5">
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setOpenIndex(index)}
                        aria-label={t("goToPhoto", { number: index + 1 })}
                        aria-current={index === openIndex}
                        className={cn(
                          "focus-visible:ring-ring shrink-0 overflow-hidden rounded-lg transition outline-none focus-visible:ring-2",
                          index === openIndex
                            ? "ring-primary ring-2"
                            : "opacity-50 hover:opacity-90",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset */}
                        <img
                          src={image.url}
                          alt={t("photoAlt", { name, number: index + 1 })}
                          className="size-14 object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
