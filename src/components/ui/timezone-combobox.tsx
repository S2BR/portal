"use client";

import { useEffect, useState } from "react";

import type { Timezone } from "@/app/api/auth/timezones/route";
import { Combobox } from "@/components/ui/combobox";

/**
 * A searchable IANA-timezone picker backed by the account's `/timezones` list. The current value is
 * always kept selectable — even before the list loads or if the list omits it — so a seeded default
 * (a device or address zone) shows immediately. Presentational; the parent owns the value.
 */
export function TimezoneCombobox({
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  className?: string;
}) {
  const [timezones, setTimezones] = useState<Timezone[]>([]);

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/timezones")
      .then((response) => response.json())
      .then((data: { timezones?: Timezone[] }) => {
        if (active && data.timezones) {
          setTimezones(data.timezones);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const options = timezones.map((zone) => ({ value: zone.id, label: zone.label }));
  if (value && !options.some((option) => option.value === value)) {
    options.unshift({ value, label: value.replace(/_/g, " ") });
  }

  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      className={className}
    />
  );
}
