"use client";

import { Check, ChevronDown, ListFilter, Plus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A Linear/Notion-style filter bar: a row of segmented pills, each `[field · operator ▾ · value · ✕]`,
 * plus an "Add filter" field picker and "Clear all". Applies live (no Apply button); pills combine with
 * AND. Field types: select · multiselect · text · number (with a `between` range). Controlled via
 * `FilterValue[]` or uncontrolled via `defaultValue`. All copy (including operator labels) is injectable
 * through `labels` so the whole thing localizes.
 */

export type FilterFieldType = "select" | "multiselect" | "text" | "number";

export interface FilterOption {
  value: string;
  label: string;
}

/** `shape` picks the value control: "none" hides it (e.g. "is empty"); "range" pairs min/max. */
export interface FilterOperator {
  id: string;
  shape?: "none" | "scalar" | "range";
}

export interface FilterField {
  id: string;
  label: string;
  icon?: LucideIcon;
  type: FilterFieldType;
  /** For select / multiselect. */
  options?: FilterOption[];
  /** Override the default operator set for the type. */
  operators?: FilterOperator[];
  placeholder?: string;
}

export interface FilterValue {
  /** Stable key for this pill. */
  id: string;
  /** A {@link FilterField} id. */
  field: string;
  /** A {@link FilterOperator} id. */
  operator: string;
  value: unknown;
}

export interface NumberRange {
  min: number | null;
  max: number | null;
}

export interface FiltersLabels {
  addFilter: string;
  clearAll: string;
  search: string;
  noResults: string;
  min: string;
  max: string;
  /** Operator id → localized label. Falls back to the id when absent. */
  operators: Record<string, string>;
}

const DEFAULT_OPERATORS: Record<FilterFieldType, FilterOperator[]> = {
  select: [
    { id: "is" },
    { id: "is_not" },
    { id: "is_empty", shape: "none" },
    { id: "is_not_empty", shape: "none" },
  ],
  multiselect: [
    { id: "any_of" },
    { id: "none_of" },
    { id: "all_of" },
    { id: "is_empty", shape: "none" },
  ],
  text: [
    { id: "contains" },
    { id: "not_contains" },
    { id: "starts_with" },
    { id: "ends_with" },
    { id: "is" },
    { id: "is_empty", shape: "none" },
  ],
  number: [
    { id: "eq" },
    { id: "neq" },
    { id: "gt" },
    { id: "lt" },
    { id: "between", shape: "range" },
  ],
};

function operatorsFor(field: FilterField): FilterOperator[] {
  return field.operators ?? DEFAULT_OPERATORS[field.type];
}

function operatorShape(
  field: FilterField,
  id: string,
): "none" | "scalar" | "range" {
  return (
    operatorsFor(field).find((operator) => operator.id === id)?.shape ??
    "scalar"
  );
}

/** The typed empty value for a field + operator (re-seeded when the operator's shape changes). */
function emptyValue(field: FilterField, operatorId: string): unknown {
  if (operatorShape(field, operatorId) === "none") {
    return null;
  }
  if (operatorShape(field, operatorId) === "range") {
    return { min: null, max: null } satisfies NumberRange;
  }
  if (field.type === "multiselect") {
    return [];
  }
  if (field.type === "number") {
    return null;
  }
  return "";
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `f${Date.now().toString(36)}${counter}`;
}

export function Filters({
  fields,
  value,
  defaultValue = [],
  onValueChange,
  labels,
  className,
}: {
  fields: FilterField[];
  value?: FilterValue[];
  defaultValue?: FilterValue[];
  onValueChange?: (value: FilterValue[]) => void;
  labels: FiltersLabels;
  className?: string;
}) {
  const [internal, setInternal] = useState<FilterValue[]>(defaultValue);
  const filters = value ?? internal;
  // The pill whose value control should open itself the moment it's added (one-gesture add).
  const [autoOpenId, setAutoOpenId] = useState<string | null>(null);

  const commit = (next: FilterValue[]) => {
    if (value === undefined) {
      setInternal(next);
    }
    onValueChange?.(next);
  };

  const addField = (field: FilterField) => {
    const operator = operatorsFor(field)[0];
    if (!operator) {
      return;
    }
    const id = nextId();
    commit([
      ...filters,
      {
        id,
        field: field.id,
        operator: operator.id,
        value: emptyValue(field, operator.id),
      },
    ]);
    setAutoOpenId(id);
  };

  const update = (id: string, patch: Partial<FilterValue>) => {
    commit(
      filters.map((filter) =>
        filter.id === id ? { ...filter, ...patch } : filter,
      ),
    );
  };

  const remove = (id: string) => {
    commit(filters.filter((filter) => filter.id !== id));
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {filters.map((filter) => {
        const resolved = fields.find(
          (candidate) => candidate.id === filter.field,
        );
        if (!resolved) {
          return null;
        }
        return (
          <FilterChip
            key={filter.id}
            field={resolved}
            filter={filter}
            labels={labels}
            autoOpen={autoOpenId === filter.id}
            onAutoOpened={() => setAutoOpenId(null)}
            onOperator={(operatorId) =>
              update(filter.id, {
                operator: operatorId,
                // Re-seed the value when the operator's control shape changes.
                value:
                  operatorShape(resolved, operatorId) ===
                  operatorShape(resolved, filter.operator)
                    ? filter.value
                    : emptyValue(resolved, operatorId),
              })
            }
            onValue={(next) => update(filter.id, { value: next })}
            onRemove={() => remove(filter.id)}
          />
        );
      })}

      <AddFilterButton
        fields={fields}
        used={filters.map((filter) => filter.field)}
        labels={labels}
        onPick={addField}
      />

      {filters.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => commit([])}
        >
          {labels.clearAll}
        </Button>
      ) : null}
    </div>
  );
}

function AddFilterButton({
  fields,
  used,
  labels,
  onPick,
}: {
  fields: FilterField[];
  used: string[];
  labels: FiltersLabels;
  onPick: (field: FilterField) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 border-dashed"
        >
          <Plus className="size-4" aria-hidden />
          {labels.addFilter}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <Command>
          <CommandInput placeholder={labels.search} />
          <CommandList>
            <CommandEmpty>{labels.noResults}</CommandEmpty>
            {fields.map((field) => (
              <CommandItem
                key={field.id}
                value={field.label}
                // A field already in play is disabled (one condition per field).
                disabled={used.includes(field.id)}
                onSelect={() => {
                  onPick(field);
                  setOpen(false);
                }}
                className="gap-2"
              >
                {field.icon ? (
                  <field.icon
                    className="text-muted-foreground size-4"
                    aria-hidden
                  />
                ) : (
                  <ListFilter
                    className="text-muted-foreground size-4"
                    aria-hidden
                  />
                )}
                {field.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function FilterChip({
  field,
  filter,
  labels,
  autoOpen,
  onAutoOpened,
  onOperator,
  onValue,
  onRemove,
}: {
  field: FilterField;
  filter: FilterValue;
  labels: FiltersLabels;
  autoOpen: boolean;
  onAutoOpened: () => void;
  onOperator: (operatorId: string) => void;
  onValue: (value: unknown) => void;
  onRemove: () => void;
}) {
  const operators = operatorsFor(field);
  const shape = operatorShape(field, filter.operator);
  const Icon = field.icon;

  const operatorLabel = (id: string) => labels.operators[id] ?? id;

  return (
    <div className="bg-card inline-flex h-9 items-center overflow-hidden rounded-lg border text-sm">
      <span className="text-muted-foreground flex items-center gap-1.5 ps-2.5 pe-2 font-medium">
        {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
        {field.label}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="hover:bg-muted/60 flex h-full items-center gap-1 border-s px-2 transition-colors"
            aria-label={`${field.label} operator: ${operatorLabel(filter.operator)}`}
          >
            {operatorLabel(filter.operator)}
            <ChevronDown className="size-3.5 opacity-50" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={filter.operator}
            onValueChange={onOperator}
          >
            {operators.map((operator) => (
              <DropdownMenuRadioItem key={operator.id} value={operator.id}>
                {operatorLabel(operator.id)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {shape !== "none" ? (
        <div className="flex h-full items-center border-s">
          <ValueControl
            field={field}
            operatorShape={shape}
            value={filter.value}
            labels={labels}
            autoOpen={autoOpen}
            onAutoOpened={onAutoOpened}
            onChange={onValue}
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:bg-muted/60 hover:text-foreground flex h-full items-center border-s px-2 transition-colors"
        aria-label={`Remove ${field.label} filter`}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

function ValueControl({
  field,
  operatorShape: shape,
  value,
  labels,
  autoOpen,
  onAutoOpened,
  onChange,
}: {
  field: FilterField;
  operatorShape: "scalar" | "range";
  value: unknown;
  labels: FiltersLabels;
  autoOpen: boolean;
  onAutoOpened: () => void;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "number" && shape === "range") {
    const range = (value as NumberRange | null) ?? { min: null, max: null };
    return (
      <div className="flex h-full items-center">
        <NumberInput
          value={range.min}
          placeholder={labels.min}
          autoFocus={autoOpen}
          onFocused={onAutoOpened}
          onChange={(min) => onChange({ ...range, min })}
        />
        <span className="text-muted-foreground px-0.5">–</span>
        <NumberInput
          value={range.max}
          placeholder={labels.max}
          onChange={(max) => onChange({ ...range, max })}
        />
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <NumberInput
        value={(value as number | null) ?? null}
        placeholder={field.placeholder ?? "0"}
        autoFocus={autoOpen}
        onFocused={onAutoOpened}
        onChange={(next) => onChange(next)}
      />
    );
  }

  if (field.type === "text") {
    return (
      <TextInput
        value={(value as string) ?? ""}
        placeholder={field.placeholder ?? ""}
        autoFocus={autoOpen}
        onFocused={onAutoOpened}
        onChange={onChange}
      />
    );
  }

  if (field.type === "multiselect") {
    return (
      <OptionPicker
        multiple
        options={field.options ?? []}
        value={(value as string[]) ?? []}
        labels={labels}
        placeholder={field.placeholder}
        autoOpen={autoOpen}
        onAutoOpened={onAutoOpened}
        onChange={onChange}
      />
    );
  }

  // select
  return (
    <OptionPicker
      options={field.options ?? []}
      value={value == null ? [] : [value as string]}
      labels={labels}
      placeholder={field.placeholder}
      autoOpen={autoOpen}
      onAutoOpened={onAutoOpened}
      onChange={(next) => onChange((next as string[])[0] ?? null)}
    />
  );
}

function TextInput({
  value,
  placeholder,
  autoFocus,
  onFocused,
  onChange,
}: {
  value: string;
  placeholder: string;
  autoFocus?: boolean;
  onFocused?: () => void;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) {
      ref.current?.focus();
      onFocused?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);
  return (
    <input
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="placeholder:text-muted-foreground h-full w-40 bg-transparent px-2 outline-none"
    />
  );
}

function NumberInput({
  value,
  placeholder,
  autoFocus,
  onFocused,
  onChange,
}: {
  value: number | null;
  placeholder: string;
  autoFocus?: boolean;
  onFocused?: () => void;
  onChange: (value: number | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) {
      ref.current?.focus();
      onFocused?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);
  return (
    <input
      ref={ref}
      type="number"
      inputMode="decimal"
      value={value === null ? "" : String(value)}
      placeholder={placeholder}
      onChange={(event) =>
        onChange(event.target.value === "" ? null : Number(event.target.value))
      }
      className="placeholder:text-muted-foreground h-full w-20 bg-transparent px-2 tabular-nums outline-none"
    />
  );
}

function OptionPicker({
  options,
  value,
  labels,
  placeholder,
  multiple,
  autoOpen,
  onAutoOpened,
  onChange,
}: {
  options: FilterOption[];
  value: string[];
  labels: FiltersLabels;
  placeholder?: string;
  multiple?: boolean;
  autoOpen: boolean;
  onAutoOpened: () => void;
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (autoOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
      onAutoOpened();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  const selected = options.filter((option) => value.includes(option.value));
  const summary =
    selected.length === 0
      ? (placeholder ?? "…")
      : selected.length === 1
        ? selected[0]!.label
        : `${selected[0]!.label} +${selected.length - 1}`;

  const toggle = (optionValue: string) => {
    if (multiple) {
      onChange(
        value.includes(optionValue)
          ? value.filter((entry) => entry !== optionValue)
          : [...value, optionValue],
      );
    } else {
      onChange([optionValue]);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "hover:bg-muted/60 flex h-full items-center gap-1 px-2 transition-colors",
            selected.length === 0 && "text-muted-foreground",
          )}
        >
          {summary}
          <ChevronDown className="size-3.5 opacity-50" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-0">
        <Command>
          <CommandInput placeholder={labels.search} />
          <CommandList>
            <CommandEmpty>{labels.noResults}</CommandEmpty>
            {options.map((option) => {
              const active = value.includes(option.value);
              return (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => toggle(option.value)}
                  className="gap-2"
                >
                  <span
                    className={cn(
                      "border-input flex size-4 items-center justify-center border",
                      multiple ? "rounded" : "rounded-full",
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
