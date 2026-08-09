import { describe, expect, it } from "vitest";

import { scaleForDistance } from "@/components/ui/preview-rail";

describe("scaleForDistance", () => {
  it("is full length at the hovered tick and tapers by distance", () => {
    expect(scaleForDistance(0)).toBe(1);
    expect(scaleForDistance(1)).toBe(0.68);
    expect(scaleForDistance(2)).toBe(0.44);
    expect(scaleForDistance(3)).toBe(0.25);
    expect(scaleForDistance(9)).toBe(0.25);
  });
});
