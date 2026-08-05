"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import type { Amenity } from "@/app/api/amenities/route";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

/**
 * Category-filtered amenity picker. A group shows if it's global (no category bindings) or bound
 * to a selected root category; an amenity shows if it's global or bound to a selected subcategory,
 * and matches the search. Empty groups are hidden. The value is the set of selected amenity ids.
 */
export function AmenitiesPicker({
  groups,
  selectedRootSlugs,
  selectedSubSlugs,
  value,
  onChange,
}: {
  groups: Amenity[];
  selectedRootSlugs: string[];
  selectedSubSlugs: string[];
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const t = useTranslations("businesses.detail");
  const [search, setSearch] = useState("");

  const selected = new Set(value);
  const roots = new Set(selectedRootSlugs);
  const subs = new Set(selectedSubSlugs);
  const query = search.trim().toLowerCase();

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange([...next]);
  }

  const groupVisible = (group: Amenity): boolean => {
    const bindings = group.category_slugs ?? [];
    return bindings.length === 0 || bindings.some((slug) => roots.has(slug));
  };

  const amenityVisible = (amenity: Amenity): boolean => {
    const bindings = amenity.category_slugs ?? [];
    const scoped =
      bindings.length === 0 || bindings.some((slug) => subs.has(slug));
    const matches = query === "" || amenity.name.toLowerCase().includes(query);
    return scoped && matches;
  };

  const visible = groups
    .filter(groupVisible)
    .map((group) => ({
      group,
      amenities: (group.amenities ?? []).filter(amenityVisible),
    }))
    .filter((entry) => entry.amenities.length > 0);

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("searchAmenities")}
      />

      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">
          {t("amenitiesEmpty")}
        </p>
      ) : (
        visible.map(({ group, amenities }) => (
          <fieldset key={group.id} className="space-y-3 rounded-xl border p-4">
            <legend className="px-1 text-sm font-medium">{group.name}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {amenities.map((amenity) => (
                <label
                  key={amenity.id}
                  className="flex items-start gap-2.5 text-sm"
                >
                  <Checkbox
                    checked={selected.has(amenity.id)}
                    onCheckedChange={() => toggle(amenity.id)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block">{amenity.name}</span>
                    {amenity.description ? (
                      <span className="text-muted-foreground block text-xs">
                        {amenity.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))
      )}
    </div>
  );
}
