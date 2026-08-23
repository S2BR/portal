"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { AuthUser } from "@/lib/api/types";
import { clearUserCookie, writeUserCookie } from "@/lib/auth/user-cookie";

interface CurrentUserState {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /**
   * Optimistically merge a patch into the shown user (e.g. right after a settings save), before the
   * server confirms. The next {@link refresh} reconciles with the real record (and rewrites the
   * cookie), so a failure that refreshes rolls the optimistic value back.
   */
  applyOptimistic: (patch: Partial<AuthUser>) => void;
}

const CurrentUserContext = createContext<CurrentUserState>({
  user: null,
  loading: true,
  refresh: async () => {},
  applyOptimistic: () => {},
});

export function useCurrentUser(): CurrentUserState {
  return useContext(CurrentUserContext);
}

/**
 * Shares the signed-in user with the whole app. Mounted once in the root layout (so it never
 * remounts on navigation), it's SEEDED from the `s2br_user` display cookie — so the header renders
 * with no API call as you move between pages. On a full page load it revalidates ONCE in the
 * background through `/api/auth/me` (which refreshes the token if needed) and rewrites the cookie;
 * `refresh()` does the same after a profile change. The cookie is cleared when the session is gone.
 */
export function CurrentUserProvider({
  children,
  initialUser,
  authenticated,
  redirectOnFailure = true,
}: {
  children: ReactNode;
  /** The user decoded from the display cookie (server-side), or null. */
  initialUser: AuthUser | null;
  /** Whether a session cookie is present — gates the background revalidation (skipped when out). */
  authenticated: boolean;
  /**
   * A failed revalidation on a protected shell means the session is gone — send to sign in. On a
   * public page a stale cookie should just fall back to a signed-out header, so pass `false`.
   */
  redirectOnFailure?: boolean;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  // A skeleton only on a first-ever load (authenticated but no cookie yet); otherwise the cookie
  // value renders immediately.
  const [loading, setLoading] = useState(authenticated && initialUser === null);
  const router = useRouter();

  const load = useCallback(
    async (redirect: boolean) => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = (await response.json()) as { user: AuthUser };
          setUser(data.user);
          writeUserCookie(data.user);
        } else if (response.status === 401) {
          // Definitive sign-out: the session (and any vaulted account) is gone.
          setUser(null);
          clearUserCookie();
          if (redirect) {
            router.replace("/login");
          }
        }
        // A non-401 failure (e.g. the route's soft 503 on an upstream blip) is transient — keep
        // whatever we already show rather than signing the user out on a hiccup.
      } catch {
        // Network hiccup — keep whatever we already show rather than blanking the header.
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    // Only a signed-in visitor revalidates; a logged-out one has nothing to fetch. Runs once per
    // full page load (the provider is preserved across client navigations).
    if (!authenticated) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(redirectOnFailure);
  }, [load, redirectOnFailure, authenticated]);

  const refresh = useCallback(() => load(false), [load]);

  const applyOptimistic = useCallback((patch: Partial<AuthUser>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  return (
    <CurrentUserContext.Provider
      value={{ user, loading, refresh, applyOptimistic }}
    >
      {children}
    </CurrentUserContext.Provider>
  );
}
