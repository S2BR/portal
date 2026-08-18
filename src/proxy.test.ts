import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { ACCOUNTS_COOKIE, ADD_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";
import { proxy } from "./proxy";

function requestFor(
  pathname: string,
  options: { session?: boolean; adding?: boolean; vault?: boolean } = {},
) {
  const parts = [
    options.session ? `${REFRESH_COOKIE}=token` : null,
    options.adding ? `${ADD_COOKIE}=1` : null,
    options.vault ? `${ACCOUNTS_COOKIE}=accts` : null,
  ].filter(Boolean);
  const headers = parts.length ? { cookie: parts.join("; ") } : undefined;
  return new NextRequest(new URL(pathname, "http://localhost"), { headers });
}

/** The auth landing pages a signed-out visitor must be able to reach. */
const PUBLIC = [
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/magic-link",
];

describe("proxy auth gate", () => {
  it.each(PUBLIC)("lets a signed-out visitor reach %s", (path) => {
    const response = proxy(requestFor(path));
    // A pass-through response has no redirect Location; a gated one points at /login.
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects a signed-out visitor away from a protected route, remembering it", () => {
    const response = proxy(requestFor("/settings"));
    const location = response.headers.get("location");
    expect(location).not.toBeNull();
    const url = new URL(location as string);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe("/settings");
  });

  it.each(["/businesses", "/businesses/padaria-central-fjmi7z"])(
    "lets a signed-out visitor reach the public business page %s",
    (path) => {
      // Public directory + profile pages must be readable (and crawlable) with no session.
      expect(proxy(requestFor(path)).headers.get("location")).toBeNull();
    },
  );

  it("sends an already-authenticated visitor away from an auth page", () => {
    const response = proxy(requestFor("/login", { session: true }));
    const location = response.headers.get("location");
    expect(location).not.toBeNull();
    expect(new URL(location as string).pathname).toBe("/");
  });

  it("lets a signed-in visitor reach /login while adding another account", () => {
    const response = proxy(
      requestFor("/login", { session: true, adding: true }),
    );
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("proxy vaulted-account fallback", () => {
  it("falls back to the promote route (not /login) when the active session is gone but other accounts remain", () => {
    const response = proxy(requestFor("/portal/admin/reports", { vault: true }));
    const url = new URL(response.headers.get("location") as string);
    expect(url.pathname).toBe("/api/auth/promote");
    expect(url.searchParams.get("next")).toBe("/portal/admin/reports");
  });

  it("still sends to /login when no session and no vaulted accounts", () => {
    const response = proxy(requestFor("/portal/admin/reports"));
    const url = new URL(response.headers.get("location") as string);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe("/portal/admin/reports");
  });

  it("does not redirect when the active session is present, vault or not", () => {
    const response = proxy(requestFor("/portal/admin", { session: true, vault: true }));
    expect(response.headers.get("location")).toBeNull();
  });
});
