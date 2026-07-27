"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { AuthUser } from "@/lib/api/types";

interface CurrentUserState {
  user: AuthUser | null;
  loading: boolean;
}

const CurrentUserContext = createContext<CurrentUserState>({
  user: null,
  loading: true,
});

export function useCurrentUser(): CurrentUserState {
  return useContext(CurrentUserContext);
}

/**
 * Loads the signed-in user once (through the BFF `/api/auth/me`, which refreshes
 * the token if needed) and shares it with the authenticated shell. If the
 * session is gone, it sends the user back to sign in.
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CurrentUserState>({
    user: null,
    loading: true,
  });
  const router = useRouter();

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me")
      .then(async (response) => {
        if (!active) {
          return;
        }
        if (response.ok) {
          const data = (await response.json()) as { user: AuthUser };
          setState({ user: data.user, loading: false });
        } else {
          setState({ user: null, loading: false });
          router.replace("/login");
        }
      })
      .catch(() => {
        if (active) {
          setState({ user: null, loading: false });
        }
      });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <CurrentUserContext.Provider value={state}>
      {children}
    </CurrentUserContext.Provider>
  );
}
