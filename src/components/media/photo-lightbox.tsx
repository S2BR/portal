"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface LightboxImage {
  id: string;
  url: string | null;
  caption?: string | null;
}

export interface LightboxLabels {
  close: string;
  prev: string;
  next: string;
  /** aria-label for a thumbnail, given its 1-based position. */
  goTo: (position: number) => string;
}

/**
 * A full-screen photo lightbox: edge arrows, a position counter, an optional caption, and a thumbnail
 * strip (non-current thumbs faded, click to jump). Arrow keys page while open; clicking the backdrop
 * closes it. The open index is owned by the caller (which also renders the on-page trigger), so the
 * same lightbox backs the business profile grid and the marketplace ad hero.
 */
export function PhotoLightbox({
  images,
  openIndex,
  onOpenChange,
  alt,
  labels,
}: {
  images: LightboxImage[];
  openIndex: number | null;
  onOpenChange: (index: number | null) => void;
  alt: (index: number) => string;
  labels: LightboxLabels;
}) {
  const count = images.length;

  const step = useCallback(
    (delta: number) =>
      onOpenChange(
        openIndex === null ? null : (openIndex + delta + count) % count,
      ),
    [openIndex, count, onOpenChange],
  );

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
    <Dialog
      open={openIndex !== null}
      onOpenChange={(open) => (!open ? onOpenChange(null) : undefined)}
    >
      <DialogContent
        // Fill the viewport (no centering transform) so the arrows can pin to the SCREEN edges; the
        // image column is centered inside. Clicking the empty backdrop closes it.
        className="fixed inset-0 z-50 flex max-w-none translate-x-0 translate-y-0 items-center justify-center border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-none"
        overlayClassName="bg-black/75"
        showCloseButton={false}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onOpenChange(null);
          }
        }}
      >
        <DialogTitle className="sr-only">{alt(openIndex ?? 0)}</DialogTitle>
        {current ? (
          <>
            <DialogClose
              aria-label={labels.close}
              className="bg-background/80 hover:bg-background absolute top-4 right-4 z-10 flex size-9 items-center justify-center rounded-full shadow-md backdrop-blur transition-colors"
            >
              <X className="size-5" aria-hidden />
            </DialogClose>

            {count > 1 ? (
              <>
                <button
                  type="button"
                  aria-label={labels.prev}
                  onClick={() => step(-1)}
                  className="bg-background/80 hover:bg-background absolute top-1/2 left-2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md backdrop-blur transition-colors"
                >
                  <ChevronLeft className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={labels.next}
                  onClick={() => step(1)}
                  className="bg-background/80 hover:bg-background absolute top-1/2 right-2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md backdrop-blur transition-colors"
                >
                  <ChevronRight className="size-5" aria-hidden />
                </button>
              </>
            ) : null}

            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {current.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
                  <img
                    src={current.url}
                    alt={alt(openIndex ?? 0)}
                    className="block h-[72vh] w-auto max-w-[92vw] rounded-xl object-contain shadow-2xl shadow-black/50"
                  />
                ) : null}
                {count > 1 ? (
                  <span className="bg-background/80 text-muted-foreground absolute top-2 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-xs tabular-nums backdrop-blur">
                    {(openIndex ?? 0) + 1} / {count}
                  </span>
                ) : null}
              </div>

              {current.caption ? (
                <p className="max-w-[92vw] text-center text-sm text-white">
                  {current.caption}
                </p>
              ) : null}

              {count > 1 ? (
                <div className="flex max-w-[92vw] gap-2 overflow-x-auto p-1.5">
                  {images.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => onOpenChange(index)}
                      aria-label={labels.goTo(index + 1)}
                      aria-current={index === openIndex}
                      className={cn(
                        "focus-visible:ring-ring shrink-0 overflow-hidden rounded-lg transition outline-none focus-visible:ring-2",
                        index === openIndex
                          ? "ring-primary ring-2"
                          : "opacity-50 hover:opacity-90",
                      )}
                    >
                      {image.url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
                        <img
                          src={image.url}
                          alt={alt(index)}
                          className="size-14 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="bg-muted block size-14" />
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
