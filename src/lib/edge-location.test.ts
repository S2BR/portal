import { afterEach, expect, it, vi } from "vitest";

const store = new Map<string, string>();

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: (key: string) => store.get(key) ?? null })),
}));

import { getEdgeLocation } from "./edge-location";

afterEach(() => {
  store.clear();
});

it("returns the Vercel edge lat/lng when present", async () => {
  store.set("x-vercel-ip-latitude", "-25.4284");
  store.set("x-vercel-ip-longitude", "-49.2733");

  await expect(getEdgeLocation()).resolves.toEqual({
    latitude: -25.4284,
    longitude: -49.2733,
  });
});

it("returns null when the edge sets no headers (local dev)", async () => {
  await expect(getEdgeLocation()).resolves.toBeNull();
});

it("treats an unresolved 0,0 as no location", async () => {
  store.set("x-vercel-ip-latitude", "0");
  store.set("x-vercel-ip-longitude", "0");

  await expect(getEdgeLocation()).resolves.toBeNull();
});
