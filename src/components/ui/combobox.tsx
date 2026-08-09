"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

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

export type ComboboxOption = { value: string; label: string };

/**
 * A searchable single-select. The trigger matches {@link Input}/{@link Select}; the panel is a
 * cmdk command list with a filter box, so long lists (e.g. timezones) are typeable. `onChange`
 * receives the chosen option's value.
 */
function Combobox({
  options,
  value,
  onChange,
  id,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  className,
}: {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    // `modal` installs the popover's own scroll lock so its list stays scrollable even inside a
    // Dialog (whose scroll lock would otherwise block this portalled content — e.g. the timezone
    // list in the settings dialog).
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex h-11 w-full items-center justify-between gap-2 rounded-lg border bg-transparent px-3.5 py-2 text-base transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDownIcon
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-56"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <CheckIcon
                  className={cn(
                    "text-primary size-4",
                    option.value === value ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
                <span className="truncate">{option.label}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { Combobox };
