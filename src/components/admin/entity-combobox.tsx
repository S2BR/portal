"use client";

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

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

interface EntityOption {
  value: string;
  label: string;
}

/**
 * An async single-select that searches entities server-side (`searchPath?q=`) and resolves a saved
 * selection's label (`searchPath?refs=`). The value is an opaque reference (`business:AbC123`) — what
 * the API's morph filter matches — so the picker shows the human label while the query carries the ref.
 */
export function EntityCombobox({
  searchPath,
  value,
  onChange,
  placeholder,
  emptyLabel,
}: {
  searchPath: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);

  // Resolve the label for a preset value (e.g. from a shared/refreshed URL).
  useEffect(() => {
    if (!value) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the resolved label when the ref clears
      setLabel("");
      return;
    }
    let live = true;
    void fetch(`${searchPath}?refs=${encodeURIComponent(value)}`)
      .then((response) => response.json())
      .then((data: { data?: EntityOption[] }) => {
        if (live && data.data?.[0]) {
          setLabel(data.data[0].label);
        }
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [value, searchPath]);

  // Search as the user types (debounced) while the panel is open.
  useEffect(() => {
    if (!open) {
      return;
    }
    let live = true;
    const handle = setTimeout(() => {
      setLoading(true);
      void fetch(`${searchPath}?q=${encodeURIComponent(query.trim())}`)
        .then((response) => response.json())
        .then((data: { data?: EntityOption[] }) => {
          if (live) {
            setOptions(data.data ?? []);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (live) {
            setLoading(false);
          }
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(handle);
    };
  }, [query, open, searchPath]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-56 justify-between font-normal"
        >
          <span className="truncate">{value ? label || value : placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-sm">
                <Loader2 className="size-4 animate-spin" aria-hidden />
              </div>
            ) : (
              <CommandEmpty>{emptyLabel}</CommandEmpty>
            )}
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => {
                  onChange(option.value);
                  setLabel(option.label);
                  setOpen(false);
                }}
                className="gap-2"
              >
                <Check
                  className={cn(
                    "size-4",
                    value === option.value ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
