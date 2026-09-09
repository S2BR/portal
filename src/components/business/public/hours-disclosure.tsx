"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import type { BusinessOpeningHour } from "@/app/api/businesses/route";
import { DAYS } from "@/components/business/business-constants";
import { OpenStatusBadge } from "@/components/business/public/open-status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTime } from "@/lib/format-time";
import { cn } from "@/lib/utils";

/**
 * The open-status "time" as a trigger: shows the live "Open · Closes 5:00 PM" badge below the name,
 * and opens the full weekly hours in a dialog when tapped (over a light blur scrim, like the locale
 * menu). Keeps the profile uncluttered — the schedule is one tap away instead of always on screen.
 */
export function HoursDisclosure({
  openSlots,
  timezone,
  openingHours,
}: {
  openSlots: number[];
  timezone: string | null;
  openingHours: BusinessOpeningHour[];
}) {
  const t = useTranslations("businesses.public");
  const days = useTranslations("businesses.detail.days");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("hours")}
        className="hover:bg-muted/60 focus-visible:ring-ring -mx-1.5 inline-flex items-center rounded-md px-1.5 py-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <OpenStatusBadge slots={openSlots} timezone={timezone} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          overlayClassName="bg-black/10 backdrop-blur-[3px]"
          className="sm:max-w-sm"
        >
          <DialogHeader>
            <DialogTitle>{t("hours")}</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 text-sm tabular-nums">
            {DAYS.map((day) => {
              const entry = openingHours.find(
                (hour) => hour.day_of_week === day,
              );
              const label =
                entry &&
                !entry.closed_all_day &&
                entry.open_time &&
                entry.close_time
                  ? `${formatTime(entry.open_time, locale)} – ${formatTime(entry.close_time, locale)}`
                  : t("closed");
              return (
                <li key={day} className="flex justify-between gap-6">
                  <span className="text-muted-foreground">{days(day)}</span>
                  <span className={cn(label === t("closed") && "opacity-60")}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
