"use client";

import dynamic from "next/dynamic";

/**
 * The address map, rendered CLIENT-ONLY. Leaflet touches `window`, so on a server-rendered page it
 * must not participate in SSR/hydration (the owner editor never hit this because its map mounts only
 * after a client-side fetch). A `"use client"` wrapper lets us use `ssr: false`, which a Server
 * Component can't. The address text is still server-rendered for SEO — only the map defers.
 */
const AddressMapPreview = dynamic(
  () =>
    import("@/components/address/address-map-preview").then(
      (module) => module.AddressMapPreview,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted h-32 w-full animate-pulse rounded-lg" />
    ),
  },
);

export function ProfileMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}) {
  return (
    <AddressMapPreview
      latitude={latitude}
      longitude={longitude}
      label={label}
      className="h-32 w-full"
    />
  );
}
