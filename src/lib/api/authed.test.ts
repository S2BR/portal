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

import { __resetRefreshCoordinationForTests, callWithAuth } from "./authed";

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
  __resetRefreshCoordinationForTests();
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
      // A plain refresh keeps the display cookie so the header survives a follow-up throttle.
      { keepUserCookie: true },
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

  it("does NOT clear the session on a transient 5xx refresh failure", async () => {
    // An upstream blip (e.g. the API restarting during a dev rebuild) must not sign the user out
    // — the refresh token is still live. Keep the cookies so the next attempt recovers.
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthenticated." }))
      .mockResolvedValueOnce(
        jsonResponse(503, { message: "Service Unavailable" }),
      );

    const res = await callWithAuth({ path: "/auth/me" });

    expect(res.status).toBe(401);
    expect(clearSessionCookies).not.toHaveBeenCalled();
    expect(setSessionCookies).not.toHaveBeenCalled();
  });

  it("does NOT clear the session when the refresh response is not JSON", async () => {
    // A non-JSON body (an HTML outage page, or a mispointed PORTAL_API_URL) fails closed with a
    // non-401 status — it's transient/misconfig, not a dead refresh token, so keep the session.
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthenticated." }))
      .mockResolvedValueOnce(
        new Response("<html>outage</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      );

    await callWithAuth({ path: "/auth/me" });

    expect(clearSessionCookies).not.toHaveBeenCalled();
    expect(setSessionCookies).not.toHaveBeenCalled();
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

  it("does not replay a just-rotated token — a straggler reuses the cached rotation", async () => {
    // The real bug: a request SENT with the old cookies (access-1 / refresh-1) lands AFTER a
    // concurrent call already rotated refresh-1. It must reuse that rotation, not replay refresh-1
    // to the API — which the server treats as reuse past its grace window and burns the family.
    let refreshCalls = 0;
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).endsWith("/auth/refresh")) {
        refreshCalls += 1;
        return Promise.resolve(
          jsonResponse(200, {
            access_token: "access-2",
            refresh_token: "refresh-2",
            token_type: "Bearer",
            expires_in: 900,
          }),
        );
      }
      const authorization = (init?.headers as Record<string, string>)
        ?.Authorization;
      return Promise.resolve(
        authorization === "Bearer access-1"
          ? jsonResponse(401, { message: "Unauthenticated." })
          : jsonResponse(200, { ok: true }),
      );
    });

    // First call rotates refresh-1 → refresh-2 (one API refresh).
    const first = await callWithAuth({ path: "/a" });
    expect(first.status).toBe(200);
    expect(refreshCalls).toBe(1);

    // The straggler still carries access-1 / refresh-1 (its own request snapshot). It 401s, presents
    // refresh-1 — and must reuse the cached rotation rather than replay it to the API.
    const straggler = await callWithAuth({ path: "/b" });
    expect(straggler.status).toBe(200);
    expect(refreshCalls).toBe(1);
    expect(clearSessionCookies).not.toHaveBeenCalled();
  });
});
