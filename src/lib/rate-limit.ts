/** The wait to assume when a 429 arrives without a usable `retry_after` (limiters are per-minute). */
export const DEFAULT_RETRY_AFTER_SECONDS = 60;

export interface RateLimitInfo {
  /** Seconds to wait before retrying. */
  retryAfter: number;
}

/**
 * Recognize a BFF rate-limit response and pull out the wait. A 429 (or a `{status:'rate_limited'}`
 * body) yields the `retry_after` seconds, falling back to {@link DEFAULT_RETRY_AFTER_SECONDS} when
 * the value is missing or invalid. Returns null for anything that isn't rate limiting, so callers
 * can `const limit = parseRateLimit(...); if (limit) { … }`.
 */
export function parseRateLimit(
  status: number,
  data: { status?: string; retry_after?: number | null } | null | undefined,
): RateLimitInfo | null {
  if (status !== 429 && data?.status !== "rate_limited") {
    return null;
  }
  const retryAfter =
    typeof data?.retry_after === "number" && data.retry_after > 0
      ? Math.ceil(data.retry_after)
      : DEFAULT_RETRY_AFTER_SECONDS;
  return { retryAfter };
}
