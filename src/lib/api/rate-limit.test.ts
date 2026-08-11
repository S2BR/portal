import { describe, expect, it } from "vitest";

import type { PortalResponse } from "./client";
import { rateLimitedResponse, type RateLimitBody } from "./rate-limit";

function upstream(
  data: RateLimitBody,
  retryAfter?: number,
): PortalResponse<RateLimitBody> {
  return { ok: false, status: 429, data, retryAfter };
}

describe("rateLimitedResponse", () => {
  it("relays the rate_limited body with the wait from the API body", async () => {
    const response = rateLimitedResponse(
      upstream({ retry_after: 42, message: "Slow down." }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    await expect(response.json()).resolves.toEqual({
      status: "rate_limited",
      retry_after: 42,
      message: "Slow down.",
    });
  });

  it("falls back to the Retry-After header when the body has no retry_after", async () => {
    const response = rateLimitedResponse(upstream({ message: "Slow down." }, 30));

    expect(response.headers.get("Retry-After")).toBe("30");
    await expect(response.json()).resolves.toMatchObject({
      status: "rate_limited",
      retry_after: 30,
    });
  });

  it("omits the header when no wait is known", async () => {
    const response = rateLimitedResponse(upstream({}));

    expect(response.headers.get("Retry-After")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({
      status: "rate_limited",
      retry_after: null,
    });
  });
});
