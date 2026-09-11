import type { PublicBusiness } from "@/lib/public-business";

/**
 * The Google Maps deep-link for a business's "Directions" action — a *directions* request (no `origin`,
 * so Maps routes from the user's current location straight into turn-by-turn). The destination is the
 * readable street address by default (a named place routes better than a raw point), and the exact
 * coordinates only when the owner hand-placed the pin (`is_pinned`). Null when there's no usable
 * address at all. Shared by the header's Directions button and the profile's Location block.
 */
export function directionsHref(business: PublicBusiness): string | null {
  const main =
    business.addresses.find((address) => address.is_main) ??
    business.addresses[0];
  if (!main) {
    return null;
  }
  const coordinates =
    main.latitude !== null && main.longitude !== null
      ? `${main.latitude},${main.longitude}`
      : null;
  const addressText = [
    main.address_1,
    main.city,
    main.state_province,
    main.postal_code,
    main.country,
  ]
    .filter(Boolean)
    .join(", ");
  // Pinned → the exact point; otherwise the address text, falling back to coordinates if it's empty.
  const destination =
    main.is_pinned && coordinates ? coordinates : addressText || coordinates;
  if (!destination) {
    return null;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}
