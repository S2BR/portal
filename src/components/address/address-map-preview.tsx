"use client";

import { ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { LocationMap } from "@/components/address/location-map";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * A read-only address map thumbnail that reveals a magnifier on hover/focus and, on click, opens the
 * location on a larger pan/zoom-able (but non-editable) map in a dialog. The dialog backdrop uses the
 * same light blur as the feedback popover.
 */
export function AddressMapPreview({
  latitude,
  longitude,
  label,
  dimmed,
  className,
}: {
  latitude: number;
  longitude: number;
  /** The formatted address — names the trigger and titles the dialog. */
  label: string;
  dimmed?: boolean;
  className?: string;
}) {
  const t = useTranslations("businesses.detail");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openMap")}
        className={cn(
          "group focus-visible:ring-ring relative block shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          dimmed && "opacity-60",
          className,
        )}
      >
        <LocationMap
          latitude={latitude}
          longitude={longitude}
          interactive={false}
          className="h-full w-full"
        />
        {/* Magnifier affordance on hover/focus. */}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/35 group-hover:opacity-100 group-focus-visible:bg-black/35 group-focus-visible:opacity-100">
          <ZoomIn className="size-5 text-white drop-shadow" />
        </span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          overlayClassName="bg-black/10 backdrop-blur-[3px]"
          className="sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle className="truncate pe-6">{label}</DialogTitle>
            <DialogDescription>{t("mapPreviewHint")}</DialogDescription>
          </DialogHeader>
          <LocationMap
            latitude={latitude}
            longitude={longitude}
            interactive
            className="h-[60vh] w-full"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
