import "server-only";

import { callWithAuth } from "./authed";
import type { AuthUser } from "./types";

/** The authenticated user, or `null` when there is no valid session. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await callWithAuth<{ user: AuthUser }>({ path: "/auth/me" });
  return response.ok ? response.data.user : null;
}
