"use client";

import { LoaderCircle, MapPin, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import type { AddressPrediction } from "@/app/api/addresses/autocomplete/route";
import type { PlaceAddress } from "@/app/api/addresses/place/[id]/route";
import { Input } from "@/components/ui/input";

/**
 * A Google-Places search box. As the user types (debounced), it fetches predictions from the BFF;
 * picking one resolves the place to structured parts and calls `onSelect`, which fills the address
 * fields. The fields stay editable afterward — this only fills them.
 */
export function AddressAutocomplete({
  onSelect,
}: {
  onSelect: (address: PlaceAddress) => void;
}) {
  const t = useTranslations("businesses.detail.lookup");
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= 3;

  useEffect(() => {
    // Below the threshold we simply don't fetch; stale predictions stay in state but the render
    // hides them (see `canSearch` below), so no synchronous setState is needed here.
    if (!canSearch) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(
        `/api/addresses/autocomplete?query=${encodeURIComponent(trimmedQuery)}`,
        {
          signal: controller.signal,
        },
      )
        .then(
          (response) =>
            response.json() as Promise<{ predictions?: AddressPrediction[] }>,
        )
        .then((data) => {
          setPredictions(data.predictions ?? []);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [canSearch, trimmedQuery]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function pick(prediction: AddressPrediction) {
    setOpen(false);
    setQuery("");
    setPredictions([]);
    try {
      const response = await fetch(
        `/api/addresses/place/${encodeURIComponent(prediction.place_id)}`,
      );
      const data = (await response.json()) as { address?: PlaceAddress };
      if (data.address) {
        onSelect(data.address);
      }
    } catch {
      // Ignore — the user can still fill the fields manually.
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => canSearch && predictions.length > 0 && setOpen(true)}
          placeholder={t("placeholder")}
          className="ps-9"
        />
        {loading ? (
          <LoaderCircle className="text-muted-foreground absolute end-3 top-1/2 size-4 -translate-y-1/2 animate-spin" />
        ) : null}
      </div>
      {open && canSearch && predictions.length > 0 ? (
        <ul className="bg-popover absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border p-1 shadow-md">
          {predictions.map((prediction) => (
            <li key={prediction.place_id}>
              <button
                type="button"
                onClick={() => pick(prediction)}
                className="hover:bg-accent focus-visible:bg-accent flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-start text-sm outline-none"
              >
                <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <span>{prediction.description}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
