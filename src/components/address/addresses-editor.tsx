"use client";

import { Info, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ChangeEvent, type ReactNode } from "react";

import type { PlaceAddress } from "@/app/api/addresses/place/[id]/route";
import { AddressAutocomplete } from "@/components/business/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DragHandle,
  overlayClass,
  placeholderClass,
} from "@/components/ui/drag-handle";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  SortableList,
  type SortableItemRender,
} from "@/components/ui/sortable-list";
import { Textarea } from "@/components/ui/textarea";
import { formatBusinessAddress } from "@/lib/format-address";
import { cn } from "@/lib/utils";

/** A single postal address, as edited in the form. `key` is a stable client id for list rendering and
 *  drag reordering; every field is a string (empty when absent) so it maps straight to `<input>`s. */
export type AddressEntry = {
  key: string; // stable client key for the list
  address_1: string;
  address_2: string;
  apartment_suite: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  latitude: string;
  longitude: string;
  notes: string;
  isMain: boolean;
};

type AddressStringField = Exclude<keyof AddressEntry, "isMain" | "key">;

/** A fresh, empty address — the starting point for a newly added row. */
export function blankAddress(): AddressEntry {
  return {
    key: crypto.randomUUID(),
    address_1: "",
    address_2: "",
    apartment_suite: "",
    city: "",
    state_province: "",
    postal_code: "",
    country: "",
    latitude: "",
    longitude: "",
    notes: "",
    isMain: false,
  };
}

/**
 * A reorderable list of postal addresses: a brand-new row shows only a place search (with an "enter it
 * manually" escape hatch) and expands to the full form once an address is picked; exactly one address
 * is main; while dragging, every row collapses to a compact summary so a long list stays reorderable.
 * Reusable wherever an entity carries addresses (businesses, events, locations, …).
 */
export function AddressesEditor({
  value,
  onChange,
}: {
  value: AddressEntry[];
  onChange: (value: AddressEntry[]) => void;
}) {
  const t = useTranslations("businesses.detail");
  const fields = useTranslations("businesses.detail.fields");
  const locale = useLocale();
  // While an address is being dragged, every row shows as a compact summary so a long list (the user
  // keeps ~10) is short enough to reorder without scrolling the whole page.
  const [dragging, setDragging] = useState(false);
  const sortable = value.length > 1;
  // A brand-new (empty) address shows only the search field until an address is picked (or the user
  // chooses to fill it in by hand) — so adding one doesn't drop a big empty form on the page.
  const [manualKeys, setManualKeys] = useState<Set<string>>(new Set());
  const revealManual = (key: string) =>
    setManualKeys((previous) => new Set(previous).add(key));
  const isSearchOnly = (entry: AddressEntry) =>
    entry.address_1.trim() === "" &&
    entry.city.trim() === "" &&
    !manualKeys.has(entry.key);

  const update = (key: string, changes: Partial<AddressEntry>) =>
    onChange(value.map((e) => (e.key === key ? { ...e, ...changes } : e)));
  const remove = (key: string) => onChange(value.filter((e) => e.key !== key));
  // Exactly one address is main: setting one unsets the rest.
  const setMain = (key: string, main: boolean) =>
    onChange(
      value.map((e) => ({
        ...e,
        isMain: e.key === key ? main : main ? false : e.isMain,
      })),
    );
  const fill = (key: string, place: PlaceAddress) =>
    update(key, {
      address_1: place.address_1 ?? "",
      apartment_suite: place.apartment_suite ?? "",
      city: place.city ?? "",
      state_province: place.state_province ?? "",
      postal_code: place.postal_code ?? "",
      country: place.country ?? "",
      latitude: place.latitude?.toString() ?? "",
      longitude: place.longitude?.toString() ?? "",
    });
  const set =
    (key: string, field: AddressStringField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update(key, { [field]: event.target.value });

  // The same country-aware, multi-line formatting used in read mode.
  const summaryLines = (entry: AddressEntry): string[] => {
    const lines = formatBusinessAddress(
      {
        id: 0,
        address_1: entry.address_1,
        address_2: entry.address_2 || null,
        apartment_suite: entry.apartment_suite || null,
        city: entry.city,
        state_province: entry.state_province || null,
        postal_code: entry.postal_code || null,
        country: entry.country,
        latitude: null,
        longitude: null,
        notes: null,
        is_main: entry.isMain,
      },
      locale,
    );
    return lines.length > 0 ? lines : [fields("line1")];
  };

  const reorderHandle = (handle: SortableItemRender["handle"]) => (
    <DragHandle
      ref={handle.ref}
      label={t("reorder")}
      {...handle.attributes}
      {...handle.listeners}
    />
  );

  /** The read-mode-style address block shown while dragging (and in the overlay). */
  const compactBody = (entry: AddressEntry, index: number, handle: ReactNode) => (
    <>
      {handle}
      <span className="text-muted-foreground mt-0.5 w-5 shrink-0 text-center text-xs tabular-nums">
        {index + 1}
      </span>
      <address className="text-foreground/90 min-w-0 flex-1 space-y-0.5 text-sm leading-snug not-italic">
        {summaryLines(entry).map((line) => (
          <span key={line} className="block truncate">
            {line}
          </span>
        ))}
      </address>
      {entry.isMain ? (
        <span
          className="bg-brand-green mt-1 size-2 shrink-0 rounded-full"
          aria-label={t("mainAddress")}
        />
      ) : null}
    </>
  );

  /** A brand-new address: just the place search, plus an escape hatch to fill it in by hand. */
  const searchBody = (entry: AddressEntry, handle: ReactNode) => (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {handle}
          <span className="text-sm font-medium">{t("newAddress")}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("removeAddress")}
          onClick={() => remove(entry.key)}
        >
          <X className="size-4" />
        </Button>
      </div>
      <AddressAutocomplete onSelect={(place) => fill(entry.key, place)} />
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2 transition-colors"
        onClick={() => revealManual(entry.key)}
      >
        {t("enterManually")}
      </button>
    </>
  );

  /** The full editable address form. */
  const fullBody = (entry: AddressEntry, index: number, handle: ReactNode) => (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {handle}
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={entry.isMain}
              onCheckedChange={(checked) => setMain(entry.key, checked === true)}
            />
            {t("mainAddress")}
          </label>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("removeAddress")}
          onClick={() => remove(entry.key)}
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* The main address is a flag, not a position — a non-main address on top gets a gentle nudge. */}
      {index === 0 && !entry.isMain ? (
        <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2">
          <span className="text-muted-foreground text-sm">
            {t("makeMainQuestion")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMain(entry.key, true)}
          >
            {t("setAsMain")}
          </Button>
        </div>
      ) : null}

      <AddressAutocomplete onSelect={(place) => fill(entry.key, place)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={fields("line1")}>
            <Input value={entry.address_1} onChange={set(entry.key, "address_1")} />
          </Field>
        </div>
        <Field label={fields("apartmentSuite")}>
          <Input
            value={entry.apartment_suite}
            onChange={set(entry.key, "apartment_suite")}
          />
        </Field>
        <Field label={fields("line2")}>
          <Input value={entry.address_2} onChange={set(entry.key, "address_2")} />
        </Field>
        <Field label={fields("city")}>
          <Input value={entry.city} onChange={set(entry.key, "city")} />
        </Field>
        <Field label={fields("stateProvince")}>
          <Input
            value={entry.state_province}
            onChange={set(entry.key, "state_province")}
          />
        </Field>
        <Field label={fields("postalCode")}>
          <Input
            value={entry.postal_code}
            onChange={set(entry.key, "postal_code")}
          />
        </Field>
        <Field label={fields("country")}>
          <Input
            value={entry.country}
            onChange={set(entry.key, "country")}
            maxLength={2}
            className="uppercase"
          />
        </Field>
        <Field label={fields("latitude")}>
          <Input
            value={entry.latitude}
            onChange={set(entry.key, "latitude")}
            inputMode="decimal"
          />
        </Field>
        <Field label={fields("longitude")}>
          <Input
            value={entry.longitude}
            onChange={set(entry.key, "longitude")}
            inputMode="decimal"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={fields("notes")}>
            <Textarea
              value={entry.notes}
              onChange={set(entry.key, "notes")}
              rows={2}
            />
          </Field>
        </div>
      </div>
    </>
  );

  return (
    <div className="[&_input]:bg-background [&_textarea]:bg-background [&_[data-slot=select-trigger]]:bg-background [&_[data-slot=combobox-trigger]]:bg-background dark:[&_input]:bg-input/30 dark:[&_textarea]:bg-input/30 dark:[&_[data-slot=select-trigger]]:bg-input/30 dark:[&_[data-slot=combobox-trigger]]:bg-input/30 space-y-4">
      <div className="bg-muted/40 flex items-start gap-3 rounded-lg p-4">
        <Info
          aria-hidden
          className="text-muted-foreground mt-0.5 size-4 shrink-0"
        />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">{t("addressNoteTitle")}</p>
          <p className="text-muted-foreground text-sm text-pretty">
            {t("addressNoteBody")}
          </p>
        </div>
      </div>
      {sortable ? (
        <SortableList
          items={value}
          getId={(e) => e.key}
          onReorder={onChange}
          onDragStart={() => setDragging(true)}
          onDragEnd={() => setDragging(false)}
          className="space-y-4"
          renderItem={(entry, { setNodeRef, style, isDragging, handle }) => {
            const index = value.indexOf(entry);
            if (isDragging) {
              // The gray drop slot — compact, content invisible (it rides the overlay).
              return (
                <div
                  ref={setNodeRef}
                  style={style}
                  className={cn(
                    "flex items-start gap-2 px-1 py-2",
                    placeholderClass,
                  )}
                >
                  <div className="invisible flex flex-1 items-start gap-2">
                    {compactBody(entry, index, reorderHandle(handle))}
                  </div>
                </div>
              );
            }
            if (dragging) {
              // Another row is being dragged → collapse to a compact summary.
              return (
                <div
                  ref={setNodeRef}
                  style={style}
                  className="bg-muted-foreground/10 flex items-start gap-2 rounded-lg px-1 py-2"
                >
                  {compactBody(entry, index, reorderHandle(handle))}
                </div>
              );
            }
            return (
              <div
                ref={setNodeRef}
                style={style}
                // A slight gray on hover (the business-type selector's unselected tone) helps tell one
                // address's form from the next.
                className="hover:bg-muted/40 space-y-4 rounded-lg p-3 transition-colors"
              >
                {isSearchOnly(entry)
                  ? searchBody(entry, reorderHandle(handle))
                  : fullBody(entry, index, reorderHandle(handle))}
              </div>
            );
          }}
          renderOverlay={(entry) => (
            <div
              className={cn(
                "flex w-full items-start gap-2 px-1 py-2",
                overlayClass,
              )}
            >
              {compactBody(entry, value.indexOf(entry), <DragHandle label={t("reorder")} />)}
            </div>
          )}
        />
      ) : (
        <div className="space-y-4">
          {value.map((entry, index) => (
            <div
              key={entry.key}
              className="hover:bg-muted/40 space-y-4 rounded-lg p-3 transition-colors"
            >
              {isSearchOnly(entry)
                ? searchBody(entry, null)
                : fullBody(entry, index, null)}
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, blankAddress()])}
      >
        <Plus className="size-4" />
        {t("addAddress")}
      </Button>
    </div>
  );
}
