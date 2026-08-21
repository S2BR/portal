"use client";

import { Check, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * A faceted multi-select filter: a button showing the facet label + a count badge, opening a
 * searchable checklist. Reusable across the admin queues — it owns no state, it just reflects
 * `selected` and reports every toggle through `onChange` (the caller mirrors it to the URL).
 */
export function FilterMultiSelect({
  label,
  options,
  selected,
  onChange,
  searchPlaceholder,
  emptyLabel,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  searchPlaceholder: string;
  emptyLabel: string;
}) {
  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((entry) => entry !== value)
        : [...selected, value],
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {label}
          {selected.length > 0 ? (
            <Badge variant="neutral" className="tabular-nums">
              {selected.length}
            </Badge>
          ) : null}
          <ChevronDown className="size-4 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {options.map((option) => {
              const active = selected.includes(option.value);
              return (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => toggle(option.value)}
                  className="gap-2"
                >
                  <span
                    className={cn(
                      "border-input flex size-4 items-center justify-center rounded border",
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
