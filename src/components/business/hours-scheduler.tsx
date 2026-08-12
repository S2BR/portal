"use client";

import { Copy, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { DayOfWeek } from "@/app/api/businesses/route";
import { DAYS } from "@/components/business/business-constants";
import {
  DEFAULT_SLOT,
  oneHourLater,
  TimeSelect,
  type HourSlot,
} from "@/components/business/time-ranges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Time helpers now live in time-ranges; re-export so existing consumers keep importing from here.
export { formatTime } from "@/components/business/time-ranges";
export type { HourSlot } from "@/components/business/time-ranges";

export type DaySchedule = { enabled: boolean; slots: HourSlot[] };
export type WeekSchedule = Record<DayOfWeek, DaySchedule>;

/** Copy this day's hours to other days — a popover with per-day checkboxes + "Every day". */
function CopyToDays({
  sourceDay,
  onApply,
}: {
  sourceDay: DayOfWeek;
  onApply: (targets: DayOfWeek[]) => void;
}) {
  const t = useTranslations("businesses.detail");
  const days = useTranslations("businesses.detail.days");
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<DayOfWeek[]>([]);

  const others = DAYS.filter((day) => day !== sourceDay);
  const allChecked = others.every((day) => targets.includes(day));

  function toggle(day: DayOfWeek, checked: boolean) {
    setTargets((current) =>
      checked ? [...current, day] : current.filter((value) => value !== day),
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTargets([]);
        }
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              aria-label={t("copyTo")}
            >
              <Copy className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("copyTo")}</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-56 space-y-1 p-2">
        <label className="hover:bg-muted flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium">
          <Checkbox
            checked={allChecked}
            onCheckedChange={(checked) =>
              setTargets(checked === true ? others : [])
            }
          />
          {t("everyDay")}
        </label>
        <div className="bg-border my-1 h-px" />
        {others.map((day) => (
          <label
            key={day}
            className="hover:bg-muted flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm"
          >
            <Checkbox
              checked={targets.includes(day)}
              onCheckedChange={(checked) => toggle(day, checked === true)}
            />
            {days(day)}
          </label>
        ))}
        <Button
          type="button"
          size="sm"
          className="mt-1 w-full"
          disabled={targets.length === 0}
          onClick={() => {
            onApply(targets);
            setOpen(false);
            setTargets([]);
          }}
        >
          {t("apply")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Weekly opening-hours scheduler (after beui's availability-scheduler): a switch per day, preset
 * time-range dropdowns, multiple ranges per day, and copy-to-days. Emits a {@link WeekSchedule};
 * the parent maps it to the API's flat `opening_hours` (one row per range).
 */
export function HoursScheduler({
  value,
  onChange,
}: {
  value: WeekSchedule;
  onChange: (value: WeekSchedule) => void;
}) {
  const t = useTranslations("businesses.detail");
  const days = useTranslations("businesses.detail.days");
  const fields = useTranslations("businesses.detail.fields");

  function setDay(day: DayOfWeek, schedule: DaySchedule) {
    onChange({ ...value, [day]: schedule });
  }

  function toggleDay(day: DayOfWeek, enabled: boolean) {
    const current = value[day];
    setDay(day, {
      enabled,
      slots:
        enabled && current.slots.length === 0
          ? [{ ...DEFAULT_SLOT }]
          : current.slots,
    });
  }

  function addSlot(day: DayOfWeek) {
    const current = value[day];
    const last = current.slots[current.slots.length - 1];
    const open = last?.close ?? DEFAULT_SLOT.open;
    setDay(day, {
      enabled: true,
      slots: [...current.slots, { open, close: oneHourLater(open) }],
    });
  }

  function updateSlot(day: DayOfWeek, index: number, patch: Partial<HourSlot>) {
    const current = value[day];
    setDay(day, {
      enabled: true,
      slots: current.slots.map((slot, position) =>
        position === index ? { ...slot, ...patch } : slot,
      ),
    });
  }

  function removeSlot(day: DayOfWeek, index: number) {
    const remaining = value[day].slots.filter(
      (_, position) => position !== index,
    );
    // Removing the last range marks the day unavailable (matches beui).
    setDay(day, { enabled: remaining.length > 0, slots: remaining });
  }

  function copyTo(sourceDay: DayOfWeek, targets: DayOfWeek[]) {
    const source = value[sourceDay];
    const next = { ...value };
    for (const day of targets) {
      next[day] = {
        enabled: source.enabled,
        slots: source.slots.map((slot) => ({ ...slot })),
      };
    }
    onChange(next);
  }

  return (
    <div className="rounded-xl border">
      {DAYS.map((day) => {
        const schedule = value[day];
        return (
          <div
            key={day}
            className="flex flex-col gap-3 border-b p-3 last:border-b-0 sm:flex-row sm:items-start"
          >
            <div className="flex w-40 shrink-0 items-center gap-2.5 pt-1.5">
              <Switch
                id={`hours-${day}`}
                checked={schedule.enabled}
                onCheckedChange={(checked) => toggleDay(day, checked === true)}
              />
              <label htmlFor={`hours-${day}`} className="text-sm font-medium">
                {days(day)}
              </label>
            </div>

            {schedule.enabled ? (
              <>
                <div className="min-w-0 flex-1 space-y-2">
                  {schedule.slots.map((slot, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <TimeSelect
                        value={slot.open}
                        onChange={(open) => updateSlot(day, index, { open })}
                        label={fields("open")}
                      />
                      <span className="text-muted-foreground">–</span>
                      <TimeSelect
                        value={slot.close}
                        onChange={(close) => updateSlot(day, index, { close })}
                        label={fields("close")}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => removeSlot(day, index)}
                            aria-label={t("removeTime")}
                          >
                            <X className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("removeTime")}</TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </div>
                <div className="flex shrink-0 items-center gap-1 pt-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => addSlot(day)}
                        aria-label={t("addTime")}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("addTime")}</TooltipContent>
                  </Tooltip>
                  <CopyToDays
                    sourceDay={day}
                    onApply={(targets) => copyTo(day, targets)}
                  />
                </div>
              </>
            ) : (
              <span className="text-muted-foreground flex-1 pt-1.5 text-sm">
                {t("unavailable")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
