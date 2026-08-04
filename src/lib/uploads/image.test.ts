import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeImage } from "./image";

afterEach(() => {
  vi.unstubAllGlobals();
});

function imageFile() {
  return new File(["binary"], "photo.jpg", { type: "image/jpeg" });
}

describe("normalizeImage", () => {
  it("returns the original file when the browser can't decode images here", async () => {
    // jsdom has no real createImageBitmap/canvas — the util must degrade, not throw.
    vi.stubGlobal("createImageBitmap", undefined);

    const file = imageFile();
    const result = await normalizeImage(file);

    expect(result).toBe(file);
  });

  it("falls back to the original when decoding rejects", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("decode failed")),
    );

    const file = imageFile();
    const result = await normalizeImage(file);

    expect(result).toBe(file);
  });
});
