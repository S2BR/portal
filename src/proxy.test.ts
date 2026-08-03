import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { ADD_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";
import { proxy } from "./proxy";

function requestFor(
  pathname: string,
  options: { session?: boolean; adding?: boolean } = {},
) {
  const parts = [
    options.session ? `${REFRESH_COOKIE}=token` : null,
    options.adding ? `${ADD_COOKIE}=1` : null,
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
