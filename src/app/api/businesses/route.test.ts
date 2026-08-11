import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { GET, POST } from "./route";

function request(body: unknown): Request {
  return new Request("http://localhost/api/businesses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/businesses", () => {
  it("creates a business and relays the flat {business} envelope on success", async () => {
    const business = {
      id: 1,
      slug: "acme-roasters",
      name: "Acme Roasters",
      type: "company",
    };
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 201,
      data: { business },
    });

    const res = await POST(request({ name: "Acme Roasters", type: "company" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", business });
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "POST",
      path: "/businesses",
      body: { name: "Acme Roasters", type: "company" },
    });
  });

  it("rejects an empty name before ever calling the API", async () => {
    const res = await POST(request({ name: "   ", type: "company" }));

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ status: "invalid" });
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("rejects an unknown business type before ever calling the API", async () => {
    const res = await POST(request({ name: "Acme", type: "nonprofit" }));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("passes the API's 422 field errors through for inline feedback", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: {
        message: "The given data was invalid.",
        errors: { name: ["The name field is required."] },
      },
    });

    const res = await POST(request({ name: "Dup", type: "company" }));
    const body = (await res.json()) as {
      status: string;
      errors?: Record<string, string[]>;
    };

    expect(res.status).toBe(422);
    expect(body.status).toBe("invalid");
    expect(body.errors?.name?.[0]).toBe("The name field is required.");
  });

  it("maps a non-422 upstream failure to a 502", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 500,
      data: { message: "boom" },
    });

    const res = await POST(request({ name: "Acme", type: "company" }));

    expect(res.status).toBe(502);
  });

  it("relays a 429 with the wait instead of a generic 502", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 429,
      data: { status: "rate_limited", retry_after: 30, message: "Slow down." },
      retryAfter: 30,
    });

    const res = await POST(request({ name: "Acme", type: "company" }));

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({
      status: "rate_limited",
      retry_after: 30,
    });
  });
});

describe("GET /api/businesses", () => {
  it("relays a 429 with the wait instead of collapsing to an empty list", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 429,
      data: { status: "rate_limited", retry_after: 45, message: "Slow down." },
      retryAfter: 45,
    });

    const res = await GET();

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({
      status: "rate_limited",
      retry_after: 45,
    });
  });

  it("still returns an empty list for a non-throttle failure", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 500,
      data: {},
    });

    const res = await GET();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ businesses: [] });
  });
});
