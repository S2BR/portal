"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UNITS, unitFor, type UnitCode } from "@/lib/products/units";
import { cn } from "@/lib/utils";

/**
 * A searchable unit-of-measure picker (combobox). Shows the localized name with its universal symbol,
 * and searches by name, symbol, or code. Owns only its open state; the value is controlled. `null`
 * clears the unit.
 */
export function UnitSelect({
  value,
  onChange,
  className,
}: {
  value: UnitCode | null;
  onChange: (value: UnitCode | null) => void;
  className?: string;
}) {
  const t = useTranslations("units");
  const [open, setOpen] = useState(false);
  const current = unitFor(value);

  return (
    // `modal` installs the popover's own scroll lock so the list stays mouse-scrollable even inside a
    // Dialog (whose scroll lock would otherwise swallow wheel events over the portaled list).
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !current && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {current
              ? current.symbol
                ? `${current.symbol} · ${t(current.code)}`
                : t(current.code)
              : t("placeholder")}
          </span>
          <ChevronsUpDown
            className="ms-2 size-4 shrink-0 opacity-50"
            aria-hidden
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0"
      >
        <Command>
          <CommandInput placeholder={t("search")} />
          <CommandList>
            <CommandEmpty>{t("empty")}</CommandEmpty>
            {value ? (
              <CommandItem
                value={t("none")}
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-muted-foreground"
              >
                {t("none")}
              </CommandItem>
            ) : null}
            {UNITS.map((unit) => (
              <CommandItem
                key={unit.code}
                value={`${unit.symbol ?? ""} ${t(unit.code)} ${unit.code}`}
                onSelect={() => {
                  onChange(unit.code);
                  setOpen(false);
                }}
                className="gap-2"
              >
                <Check
                  className={cn(
                    "size-4",
                    value === unit.code ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
                <span className="flex-1">{t(unit.code)}</span>
                {unit.symbol ? (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {unit.symbol}
                  </span>
                ) : null}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
