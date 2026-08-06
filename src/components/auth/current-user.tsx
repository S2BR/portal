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

interface CurrentUserState {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserState>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export function useCurrentUser(): CurrentUserState {
  return useContext(CurrentUserContext);
}

/**
 * Loads the signed-in user through the BFF `/api/auth/me` (which refreshes the
 * token if needed) and shares it with the authenticated shell. `refresh()`
 * re-loads it after account changes. If the session is gone on first load, the
 * user is sent back to sign in.
 */
export function CurrentUserProvider({
  children,
  redirectOnFailure = true,
}: {
  children: ReactNode;
  /**
   * On the authenticated shell, a failed load means the session is gone — send the user to sign
   * in. On a public page (the shared header), a stale cookie should just fall back to a signed-out
   * header, so pass `false`.
   */
  redirectOnFailure?: boolean;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(
    async (redirectOnFailure: boolean) => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = (await response.json()) as { user: AuthUser };
          setUser(data.user);
        } else {
          setUser(null);
          if (redirectOnFailure) {
            router.replace("/login");
          }
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    // One-off fetch on mount; setState only runs after the async response
    // resolves, which this lint rule cannot see through.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(redirectOnFailure);
  }, [load, redirectOnFailure]);

  const refresh = useCallback(() => load(false), [load]);

  return (
    <CurrentUserContext.Provider value={{ user, loading, refresh }}>
      {children}
    </CurrentUserContext.Provider>
  );
}
