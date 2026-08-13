import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/authed", () => ({ callWithAuth: vi.fn() }));

import { callWithAuth } from "@/lib/api/authed";

import { DELETE, GET, PATCH } from "./route";

function params(slug: string): { params: Promise<{ slug: string }> } {
  return { params: Promise.resolve({ slug }) };
}

function req(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/businesses/acme-roasters", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/businesses/[slug]", () => {
  it("relays the business", async () => {
    const business = { id: 1, slug: "acme-roasters", name: "Acme" };
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { business },
    });

    const res = await GET(req("GET"), params("acme-roasters"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ business });
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "GET",
      path: "/businesses/acme-roasters",
    });
  });

  it("relays a 404 for a slug the user doesn't own", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 404,
      data: {},
    });

    const res = await GET(req("GET"), params("someone-elses"));

    expect(res.status).toBe(404);
  });

  it("relays a locked business as 403 business_locked (not a generic error)", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 403,
      data: { status: "business_locked" },
    });

    const res = await GET(req("GET"), params("padaria-abc"));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ status: "business_locked" });
  });
});

describe("PATCH /api/businesses/[slug]", () => {
  it("updates and relays the business", async () => {
    const business = {
      id: 1,
      slug: "acme-roasters",
      name: "Acme",
      headline: "Hi",
    };
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { business },
    });

    const res = await PATCH(
      req("PATCH", { headline: "Hi" }),
      params("acme-roasters"),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", business });
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/businesses/acme-roasters",
      body: { headline: "Hi" },
    });
  });

  it("forwards the business timezone", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 200,
      data: { business: { id: 1, slug: "acme-roasters", name: "Acme" } },
    });

    const res = await PATCH(
      req("PATCH", { timezone: "America/Sao_Paulo" }),
      params("acme-roasters"),
    );

    expect(res.status).toBe(200);
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "PATCH",
      path: "/businesses/acme-roasters",
      body: { timezone: "America/Sao_Paulo" },
    });
  });

  it("rejects an empty patch before ever calling the API", async () => {
    const res = await PATCH(req("PATCH", {}), params("acme-roasters"));

    expect(res.status).toBe(422);
    expect(callWithAuth).not.toHaveBeenCalled();
  });

  it("relays a 404 as not_found", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 404,
      data: {},
    });

    const res = await PATCH(req("PATCH", { name: "X" }), params("gone"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ status: "not_found" });
  });

  it("passes the API's 422 field errors through", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 422,
      data: {
        message: "bad",
        errors: { name: ["The name field is required."] },
      },
    });

    const res = await PATCH(
      req("PATCH", { name: "X" }),
      params("acme-roasters"),
    );
    const body = (await res.json()) as {
      status: string;
      errors?: Record<string, string[]>;
    };

    expect(res.status).toBe(422);
    expect(body.status).toBe("invalid");
    expect(body.errors?.name?.[0]).toBe("The name field is required.");
  });
});

describe("DELETE /api/businesses/[slug]", () => {
  it("returns ok on success", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: true,
      status: 204,
      data: {},
    });

    const res = await DELETE(req("DELETE"), params("acme-roasters"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(callWithAuth).toHaveBeenCalledWith({
      method: "DELETE",
      path: "/businesses/acme-roasters",
    });
  });

  it("relays a 404", async () => {
    vi.mocked(callWithAuth).mockResolvedValue({
      ok: false,
      status: 404,
      data: {},
    });

    const res = await DELETE(req("DELETE"), params("gone"));

    expect(res.status).toBe(404);
  });
});
