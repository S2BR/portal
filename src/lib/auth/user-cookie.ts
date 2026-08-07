import type { AuthUser } from "@/lib/api/types";

/**
 * A non-httpOnly cookie holding the signed-in user's DISPLAY data (name, email, avatar URL). The
 * header renders from it, so navigating between pages needs no API call. It holds NO credentials —
 * the session tokens stay httpOnly. It's refreshed in the background on a full reload and on a
 * profile change, and cleared on sign-out.
 */
export const USER_COOKIE = "s2br_user";

// A week; every refresh overwrites it, so this is just how long a stale copy may linger.
const MAX_AGE = 60 * 60 * 24 * 7;

export function encodeUser(user: AuthUser): string {
  return encodeURIComponent(JSON.stringify(user));
}

/** Parse the cookie value (used server-side to seed, and after a client write). */
export function decodeUser(raw: string | undefined): AuthUser | null {
  if (!raw) {
    return null;
  }
  try {
    const user = JSON.parse(decodeURIComponent(raw)) as AuthUser;
    return user && typeof user.id === "number" ? user : null;
  } catch {
    return null;
  }
}

/** Client-side write — the cookie is non-httpOnly by design so the header can read it directly. */
export function writeUserCookie(user: AuthUser): void {
  document.cookie = `${USER_COOKIE}=${encodeUser(user)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function clearUserCookie(): void {
  document.cookie = `${USER_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
