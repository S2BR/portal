import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const notFound = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
  usePathname: () => "/portal/businesses/acme",
  useRouter: () => ({ replace }),
}));

// Avoid pulling the intl provider into the test — we only care that the gate CHOSE the panel.
vi.mock("@/components/ui/rate-limited", () => ({
  RateLimited: ({ retryAfter }: { retryAfter: number }) => (
    <div data-testid="rate-limited">{retryAfter}</div>
  ),
}));
vi.mock("@/components/ui/service-unavailable", () => ({
  ServiceUnavailable: () => <div data-testid="service-unavailable" />,
}));
vi.mock("@/components/business/business-locked", () => ({
  BusinessLocked: () => <div data-testid="business-locked" />,
}));

import { BusinessWorkspace } from "./business-workspace";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  vi.clearAllMocks();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

it("shows the rate-limit panel on a 429, never the 404 page", async () => {
  fetchMock.mockResolvedValue(
    jsonResponse(429, { status: "rate_limited", retry_after: 30 }),
  );

  render(
    <BusinessWorkspace slug="acme">
      <div data-testid="child" />
    </BusinessWorkspace>,
  );

  const panel = await screen.findByTestId("rate-limited");
  expect(panel.textContent).toBe("30");
  expect(notFound).not.toHaveBeenCalled();
  expect(screen.queryByTestId("child")).toBeNull();
});

it("renders the 404 page when the business is genuinely not accessible", async () => {
  fetchMock.mockResolvedValue(jsonResponse(404, {}));

  render(
    <BusinessWorkspace slug="acme">
      <div data-testid="child" />
    </BusinessWorkspace>,
  );

  await waitFor(() => expect(notFound).toHaveBeenCalled());
  expect(screen.queryByTestId("child")).toBeNull();
});

it("shows the service-unavailable panel on a 5xx, never the 404 page", async () => {
  fetchMock.mockResolvedValue(jsonResponse(503, {}));

  render(
    <BusinessWorkspace slug="acme">
      <div data-testid="child" />
    </BusinessWorkspace>,
  );

  expect(await screen.findByTestId("service-unavailable")).toBeTruthy();
  expect(notFound).not.toHaveBeenCalled();
  expect(screen.queryByTestId("child")).toBeNull();
});

it("shows the service-unavailable panel when the fetch throws (network down)", async () => {
  fetchMock.mockRejectedValue(new Error("network"));

  render(
    <BusinessWorkspace slug="acme">
      <div data-testid="child" />
    </BusinessWorkspace>,
  );

  expect(await screen.findByTestId("service-unavailable")).toBeTruthy();
  expect(notFound).not.toHaveBeenCalled();
});

it("renders the content once access is granted", async () => {
  fetchMock.mockResolvedValue(jsonResponse(200, { business: { id: 1 } }));

  render(
    <BusinessWorkspace slug="acme">
      <div data-testid="child" />
    </BusinessWorkspace>,
  );

  expect(await screen.findByTestId("child")).toBeTruthy();
  expect(notFound).not.toHaveBeenCalled();
});

it("shows the locked notice instead of content when the business is locked", async () => {
  fetchMock.mockResolvedValue(
    jsonResponse(200, { business: { id: "abc", is_locked: true } }),
  );

  render(
    <BusinessWorkspace slug="acme">
      <div data-testid="child" />
    </BusinessWorkspace>,
  );

  expect(await screen.findByTestId("business-locked")).toBeTruthy();
  expect(screen.queryByTestId("child")).toBeNull();
  expect(notFound).not.toHaveBeenCalled();
});
