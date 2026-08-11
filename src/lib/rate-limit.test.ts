import { describe, expect, it } from "vitest";

import { DEFAULT_RETRY_AFTER_SECONDS, parseRateLimit } from "./rate-limit";

describe("parseRateLimit", () => {
  it("reads the wait from a 429 with retry_after", () => {
    expect(parseRateLimit(429, { status: "rate_limited", retry_after: 42 })).toEqual({
      retryAfter: 42,
    });
  });

  it("recognizes a rate_limited body even without a 429 status", () => {
    expect(parseRateLimit(200, { status: "rate_limited", retry_after: 15 })).toEqual({
      retryAfter: 15,
    });
  });

  it("falls back to the default when retry_after is missing or invalid", () => {
    expect(parseRateLimit(429, {})).toEqual({
      retryAfter: DEFAULT_RETRY_AFTER_SECONDS,
    });
    expect(parseRateLimit(429, { retry_after: 0 })).toEqual({
      retryAfter: DEFAULT_RETRY_AFTER_SECONDS,
    });
    expect(parseRateLimit(429, { retry_after: null })).toEqual({
      retryAfter: DEFAULT_RETRY_AFTER_SECONDS,
    });
  });

  it("rounds a fractional retry_after up to whole seconds", () => {
    expect(parseRateLimit(429, { retry_after: 4.2 })).toEqual({ retryAfter: 5 });
  });

  it("returns null for anything that isn't rate limiting", () => {
    expect(parseRateLimit(200, { status: "ok" })).toBeNull();
    expect(parseRateLimit(500, undefined)).toBeNull();
    expect(parseRateLimit(422, { status: "invalid" })).toBeNull();
  });
});
