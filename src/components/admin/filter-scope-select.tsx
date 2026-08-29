"use client";

import { Check, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandItem, CommandList } from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import type { FilterOption } from "./filter-multi-select";

/**
 * A single-select facet for a scope param (e.g. product visibility) — the same look as
 * {@see FilterMultiSelect}, but exactly one option is active and picking one replaces the current
 * value (radio, not checkbox). Owns no state: it reflects `value` and reports each pick through
 * `onChange`, which the caller mirrors to the URL.
 */
export function FilterScopeSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const current = options.find((option) => option.value === value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {label}
          {current ? <Badge variant="neutral">{current.label}</Badge> : null}
          <ChevronDown className="size-4 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-0">
        <Command>
          <CommandList>
            {options.map((option) => {
              const active = option.value === value;
              return (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => onChange(option.value)}
                  className="gap-2"
                >
                  <span
                    className={cn(
                      "border-input flex size-4 items-center justify-center rounded-full border",
                      active &&
                        "bg-primary border-primary text-primary-foreground",
                    )}
                    aria-hidden
                  >
                    {active ? <Check className="size-3" /> : null}
                  </span>
                  {option.label}
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
