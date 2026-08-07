import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setSessionCookies: vi.fn(),
  clearSessionCookies: vi.fn(),
}));

import {
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
  setSessionCookies,
} from "@/lib/auth/session";

import { callWithAuth } from "./authed";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.mocked(getAccessToken).mockResolvedValue("access-1");
  vi.mocked(getRefreshToken).mockResolvedValue("refresh-1");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.clearAllMocks();
});

describe("callWithAuth", () => {
  it("returns the response directly when it is not a 401", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { user: { id: 1 } }));

    const res = await callWithAuth({ path: "/auth/me" });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setSessionCookies).not.toHaveBeenCalled();
  });

  it("refreshes once on 401, persists the rotated pair, and retries", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthenticated." }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          access_token: "access-2",
          refresh_token: "refresh-2",
          token_type: "Bearer",
          expires_in: 900,
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { user: { id: 1 } }));

    const res = await callWithAuth({ path: "/auth/me" });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(setSessionCookies).toHaveBeenCalledWith(
      expect.objectContaining({
        access_token: "access-2",
        refresh_token: "refresh-2",
      }),
    );
    const retryInit = fetchMock.mock.calls[2]![1];
    expect(retryInit.headers.Authorization).toBe("Bearer access-2");
  });

  it("clears the session when the refresh call fails", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthenticated." }))
      .mockResolvedValueOnce(jsonResponse(401, { message: "invalid" }));

    const res = await callWithAuth({ path: "/auth/me" });

    expect(res.status).toBe(401);
    expect(clearSessionCookies).toHaveBeenCalledTimes(1);
    expect(setSessionCookies).not.toHaveBeenCalled();
  });

  it("clears the session when there is no refresh token", async () => {
    vi.mocked(getRefreshToken).mockResolvedValue(undefined);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { message: "Unauthenticated." }),
    );

    const res = await callWithAuth({ path: "/auth/me" });

    expect(res.status).toBe(401);
    expect(clearSessionCookies).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("single-flights concurrent refreshes of the same token", async () => {
    // Two authed calls fire at once with an expired access token — as a page mounting several
    // components does. They must rotate the single-use refresh token ONCE between them, not race.
    let refreshCalls = 0;
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).endsWith("/auth/refresh")) {
        refreshCalls += 1;
        // A small delay keeps both callers overlapping on the in-flight refresh.
        return new Promise<Response>((resolve) => {
          setTimeout(
            () =>
              resolve(
                jsonResponse(200, {
                  access_token: "access-2",
                  refresh_token: "refresh-2",
                  token_type: "Bearer",
                  expires_in: 900,
                }),
              ),
            10,
          );
        });
      }

      const authorization = (init?.headers as Record<string, string>)
        ?.Authorization;
      return Promise.resolve(
        authorization === "Bearer access-1"
          ? jsonResponse(401, { message: "Unauthenticated." })
          : jsonResponse(200, { ok: true }),
      );
    });

    const [first, second] = await Promise.all([
      callWithAuth({ path: "/businesses/acme" }),
      callWithAuth({ path: "/categories" }),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(refreshCalls).toBe(1);
    expect(clearSessionCookies).not.toHaveBeenCalled();
    expect(setSessionCookies).toHaveBeenCalledTimes(2);
  });
});
