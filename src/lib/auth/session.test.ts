import { afterEach, expect, it, vi } from "vitest";

const cookieStore = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));
// The RS256 signature check needs real keys — not what's under test here.
vi.mock("./verify-token", () => ({ verifyAccessToken: vi.fn(async () => {}) }));

import { clearSessionCookies, setSessionCookies } from "./session";
import { USER_COOKIE } from "./user-cookie";

afterEach(() => vi.clearAllMocks());

const tokens = {
  access_token: "a",
  refresh_token: "r",
  token_type: "Bearer",
  expires_in: 900,
};

it("clears the display cookie when the active session changes (login / add / switch)", async () => {
  await setSessionCookies(tokens);
  // Otherwise the header would keep showing the previous account as "current" — the duplicate bug.
  expect(cookieStore.delete).toHaveBeenCalledWith(USER_COOKIE);
});

it("clears the display cookie on sign-out", async () => {
  await clearSessionCookies();
  expect(cookieStore.delete).toHaveBeenCalledWith(USER_COOKIE);
});
