"use client";

import {
  ChevronUp,
  EyeOff,
  Info,
  MapPin,
  Maximize2,
  Plus,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ChangeEvent, type ReactNode } from "react";

import type { PlaceAddress } from "@/app/api/addresses/place/[id]/route";
import { AddressLines } from "@/components/address/address-lines";
import { AddressMapPreview } from "@/components/address/address-map-preview";
import { LocationMap } from "@/components/address/location-map";
import { AddressAutocomplete } from "@/components/business/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatBusinessAddress } from "@/lib/format-address";
import { cn } from "@/lib/utils";

/** A single postal address, as edited in the form. `key` is a stable client id for list rendering and
 *  drag reordering; every field is a string (empty when absent) so it maps straight to `<input>`s. */
export type AddressEntry = {
  key: string; // stable client key for the list
  id?: string; // server public code (present for existing rows, absent for new ones)
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
  isHidden: boolean;
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
    isHidden: false,
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
  // With more than one address, all but the one being edited collapse to a faded "peek" so the page
  // stays short (users keep ~10). Exactly one is expanded at a time; a lone address is always open.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const isOpen = (entry: AddressEntry) => !sortable || openKey === entry.key;
  // A brand-new (empty) address shows only the place search until a place is picked — so adding one
  // doesn't drop a big empty form on the page, and every address comes from a real geocoded place.
  const isSearchOnly = (entry: AddressEntry) =>
    entry.address_1.trim() === "" && entry.city.trim() === "";
  // Which address's map (if any) is currently enlarged in the dialog, for a better look while relocating.
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const update = (key: string, changes: Partial<AddressEntry>) =>
    onChange(value.map((e) => (e.key === key ? { ...e, ...changes } : e)));
  const remove = (key: string) => {
    if (openKey === key) {
      setOpenKey(null);
    }
    onChange(value.filter((e) => e.key !== key));
  };
  // Add a fresh address and open it straight away for editing.
  const addAddress = () => {
    const entry = blankAddress();
    onChange([...value, entry]);
    setOpenKey(entry.key);
  };
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
        id: "",
        address_1: entry.address_1,
        address_2: entry.address_2 || null,
        apartment_suite: entry.apartment_suite || null,
        city: entry.city,
        state_province: entry.state_province || null,
        postal_code: entry.postal_code || null,
        country: entry.country,
        latitude: null,
        longitude: null,
        timezone: null,
        notes: null,
        is_main: entry.isMain,
        is_hidden: entry.isHidden,
      },
      locale,
    );
    return lines.length > 0 ? lines : [fields("line1")];
  };

  /** A read-only value shown in place of an input (region, country) — plain text, no edit affordance. */
  const readOnlyValue = (value: string) => (
    <p className="text-foreground/90 flex min-h-9 items-center text-sm">
      {value.trim() || "—"}
    </p>
  );

  /** The coordinate as a finite point, or null when the address has none yet. */
  const coordinate = (entry: AddressEntry): { lat: number; lng: number } | null => {
    if (entry.latitude.trim() === "" || entry.longitude.trim() === "") {
      return null;
    }
    const lat = Number(entry.latitude);
    const lng = Number(entry.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  };

  const setCoordinate = (key: string, lat: number, lng: number) =>
    update(key, { latitude: lat.toFixed(7), longitude: lng.toFixed(7) });

  /** The map (with a draggable pin) once the address has coordinates, else a hint to pick one. An
   *  expand button opens the same editable map larger in a dialog for a closer look while relocating. */
  const locationField = (entry: AddressEntry) => {
    const point = coordinate(entry);
    if (!point) {
      return (
        <p className="text-muted-foreground flex min-h-9 items-center text-sm">
          {t("locationEmpty")}
        </p>
      );
    }
    return (
      <div className="space-y-1.5">
        <div className="relative">
          <LocationMap
            latitude={point.lat}
            longitude={point.lng}
            onChange={(lat, lng) => setCoordinate(entry.key, lat, lng)}
            className="h-56 w-full"
          />
          <button
            type="button"
            onClick={() => setExpandedKey(entry.key)}
            aria-label={t("openMap")}
            className="bg-card/90 text-muted-foreground hover:text-foreground hover:bg-card focus-visible:ring-ring absolute end-2 top-2 rounded-md border p-1.5 shadow-sm backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Maximize2 className="size-4" />
          </button>
        </div>
        <p className="text-muted-foreground text-xs">
          {point.lat.toFixed(6)}, {point.lng.toFixed(6)} · {t("locationHint")}
        </p>
      </div>
    );
  };

  const reorderHandle = (handle: SortableItemRender["handle"]) => (
    <DragHandle
      ref={handle.ref}
      label={t("reorder")}
      {...handle.attributes}
      {...handle.listeners}
    />
  );

  /** A small location thumbnail for the peek, matching read mode: interactive (opens the map on click)
   *  at rest, a plain image while dragging, and a pin/eye box when the address has no coordinates. */
  const peekMap = (entry: AddressEntry, interactive: boolean) => {
    const point = coordinate(entry);
    if (!point) {
      return (
        <span
          className={cn(
            "flex h-20 w-24 shrink-0 items-center justify-center rounded-lg border",
            entry.isHidden
              ? "border-dashed text-muted-foreground/70"
              : "bg-background text-muted-foreground",
          )}
        >
          {entry.isHidden ? (
            <EyeOff className="size-4" />
          ) : (
            <MapPin className="size-4" />
          )}
        </span>
      );
    }
    if (interactive) {
      return (
        <AddressMapPreview
          latitude={point.lat}
          longitude={point.lng}
          label={summaryLines(entry).join(", ")}
          dimmed={entry.isHidden}
          className="h-20 w-24"
        />
      );
    }
    return (
      <span
        className={cn(
          "h-20 w-24 shrink-0 overflow-hidden rounded-lg",
          entry.isHidden && "opacity-60",
        )}
      >
        <LocationMap
          latitude={point.lat}
          longitude={point.lng}
          interactive={false}
          className="h-full w-full"
        />
      </span>
    );
  };

  /** The collapsed "peek" card for a filled address: a small map plus the same country-aware address
   *  format read mode uses (bold street, gray rest). The interactive variant (resting) lifts on hover
   *  and expands on click; the `static` variant (drag overlay/placeholder) is the identical card
   *  without the button/hover, so picking an address up doesn't change how it looks. */
  const peekCard = (
    entry: AddressEntry,
    handle: ReactNode,
    options?: { static?: boolean },
  ) => {
    const text = (
      <>
        <AddressLines
          lines={summaryLines(entry)}
          truncate
          className="min-w-0 flex-1"
        />
        {entry.isMain ? (
          <span
            className="bg-brand-green size-2 shrink-0 rounded-full"
            aria-label={t("mainAddress")}
          />
        ) : null}
        {entry.isHidden ? (
          <EyeOff
            className="text-muted-foreground size-3.5 shrink-0"
            aria-label={t("addressHidden")}
          />
        ) : null}
      </>
    );

    return (
      <div
        className={cn(
          "bg-card flex items-center gap-3 rounded-lg border p-3",
          !options?.static &&
            "group hover:border-foreground/20 transition-all hover:-translate-y-px hover:shadow-md",
        )}
      >
        <div className="flex items-center">{handle}</div>
        {peekMap(entry, !options?.static)}
        {options?.static ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">{text}</div>
        ) : (
          <button
            type="button"
            onClick={() => setOpenKey(entry.key)}
            aria-expanded={false}
            aria-label={t("editAddress")}
            className="focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-2 rounded-md text-start focus-visible:ring-2 focus-visible:outline-none"
          >
            {text}
          </button>
        )}
      </div>
    );
  };

  /** A brand-new address: just the place search. Addresses can only come from a searched place, so
   *  they always carry coordinates (for the map and timezone). */
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
          {entry.isHidden ? (
            <span className="text-destructive inline-flex items-center gap-1 text-xs font-medium">
              <EyeOff className="size-3.5" />
              {t("addressHidden")}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {sortable ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("collapseAddress")}
              onClick={() => setOpenKey(null)}
            >
              <ChevronUp className="size-4" />
            </Button>
          ) : null}
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
      </div>

      {/* Visibility is a setting, not address data — surfaced at the top of the block. */}
      <label className="bg-muted/40 flex items-start justify-between gap-3 rounded-lg p-4">
        <span className="flex items-start gap-2.5">
          <EyeOff className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">
              {t("hideAddress")}
            </span>
            <span className="text-muted-foreground block text-xs text-pretty">
              {t("hideAddressHint")}
            </span>
          </span>
        </span>
        <Switch
          checked={entry.isHidden}
          onCheckedChange={(checked) => update(entry.key, { isHidden: checked })}
        />
      </label>

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
        <Field label={fields("postalCode")}>
          <Input
            value={entry.postal_code}
            onChange={set(entry.key, "postal_code")}
          />
        </Field>
        {/* Region and country come from the address search — shown as read-only text. */}
        <Field label={fields("stateProvince")}>
          {readOnlyValue(entry.state_province)}
        </Field>
        <Field label={fields("country")}>
          {readOnlyValue(entry.country.toUpperCase())}
        </Field>
        {/* Coordinates are read-only too, but shown on a map: drag the pin to correct them. */}
        <div className="sm:col-span-2">
          <Field label={fields("location")}>{locationField(entry)}</Field>
        </div>
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
    <div className="space-y-4">
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
              // The drop slot — a peek-card-sized gap, content invisible (it rides the overlay).
              return (
                <div
                  ref={setNodeRef}
                  style={style}
                  className={cn("rounded-lg", placeholderClass)}
                >
                  <div className="invisible">
                    {peekCard(entry, reorderHandle(handle), {
                      static: true,
                    })}
                  </div>
                </div>
              );
            }
            if (dragging) {
              // Another row is being dragged → collapse to the same peek card (no hover/click).
              return (
                <div ref={setNodeRef} style={style}>
                  {peekCard(entry, reorderHandle(handle), {
                    static: true,
                  })}
                </div>
              );
            }
            if (isSearchOnly(entry) || isOpen(entry)) {
              return (
                <div
                  ref={setNodeRef}
                  style={style}
                  // A slight gray on hover (the business-type selector's unselected tone) helps tell
                  // one address's form from the next.
                  className="hover:bg-muted/40 space-y-4 rounded-lg p-3 transition-colors"
                >
                  {isSearchOnly(entry)
                    ? searchBody(entry, reorderHandle(handle))
                    : fullBody(entry, index, reorderHandle(handle))}
                </div>
              );
            }
            // Collapsed: the peek card that expands on click.
            return (
              <div ref={setNodeRef} style={style}>
                {peekCard(entry, reorderHandle(handle))}
              </div>
            );
          }}
          renderOverlay={(entry) => (
            <div className={cn("w-full", overlayClass)}>
              {peekCard(entry, <DragHandle label={t("reorder")} />, {
                static: true,
              })}
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
        onClick={addAddress}
      >
        <Plus className="size-4" />
        {t("addAddress")}
      </Button>

      {/* The enlarged, still-editable map — drag the pin here for a closer look while relocating. */}
      <Dialog
        open={expandedKey !== null}
        onOpenChange={(open) => {
          if (!open) {
            setExpandedKey(null);
          }
        }}
      >
        <DialogContent
          overlayClassName="bg-black/10 backdrop-blur-[3px]"
          className="sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>{fields("location")}</DialogTitle>
            <DialogDescription>{t("locationHint")}</DialogDescription>
          </DialogHeader>
          {(() => {
            const expanded = value.find((entry) => entry.key === expandedKey);
            const point = expanded ? coordinate(expanded) : null;
            return expanded && point ? (
              <LocationMap
                latitude={point.lat}
                longitude={point.lng}
                onChange={(lat, lng) => setCoordinate(expanded.key, lat, lng)}
                interactive
                className="h-[60vh] w-full"
              />
            ) : null;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
