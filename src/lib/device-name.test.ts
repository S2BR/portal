import { describe, expect, it } from "vitest";

import { deviceNameFromUserAgent } from "./device-name";

describe("deviceNameFromUserAgent", () => {
  it("names common browser + OS combinations", () => {
    expect(
      deviceNameFromUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome on macOS");

    expect(
      deviceNameFromUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      ),
    ).toBe("Firefox on Windows");

    expect(
      deviceNameFromUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe("Safari on iPhone");

    expect(
      deviceNameFromUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      ),
    ).toBe("Edge on macOS");
  });

  it("falls back to a generic label for unknown or empty agents", () => {
    expect(deviceNameFromUserAgent("")).toBe("Web browser");
    expect(deviceNameFromUserAgent("node")).toBe("Web browser");
  });
});
