import "server-only";

import { headers } from "next/headers";

export interface EdgeLocation {
  latitude: number;
  longitude: number;
}

/**
 * The visitor's approximate location, resolved by the Vercel edge from their IP
 * (`x-vercel-ip-latitude/longitude`). Used as the "near me" fallback when the browser's precise
 * geolocation is denied or unavailable. Null in local dev (the edge sets no headers) and when the
 * values are missing/unparseable.
 */
export async function getEdgeLocation(): Promise<EdgeLocation | null> {
  const requestHeaders = await headers();
  const latitude = Number(requestHeaders.get("x-vercel-ip-latitude"));
  const longitude = Number(requestHeaders.get("x-vercel-ip-longitude"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  // The edge sends 0,0 when it can't resolve — treat that as "no location".
  if (latitude === 0 && longitude === 0) {
    return null;
  }
  return { latitude, longitude };
}
