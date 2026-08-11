"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** A per-business display override — a name and/or logo that differs from what a surface fetched. */
type BusinessOverride = { name?: string; logo?: string | null };
type Overrides = Record<string, BusinessOverride>;

type BusinessIdentity = {
  /** slug → the current display name/logo, when it differs from what a surface last fetched. */
  overrides: Overrides;
  /** Optimistically set a business's display name (live while editing, or the saved value). */
  setName: (slug: string, name: string) => void;
  /** Reflect a just-uploaded logo (null clears it). Persistent — the upload already saved. */
  setLogo: (slug: string, logo: string | null) => void;
};

const BusinessIdentityContext = createContext<BusinessIdentity | null>(null);

/** Merge a partial override for one slug, returning the SAME map when nothing changes so realtime
 *  callers (e.g. name-on-keystroke) can't trigger a render loop. */
function mergeOverride(
  current: Overrides,
  slug: string,
  patch: BusinessOverride,
): Overrides {
  const previous = current[slug];
  const unchanged =
    previous !== undefined &&
    (Object.keys(patch) as (keyof BusinessOverride)[]).every(
      (key) => previous[key] === patch[key],
    );
  if (unchanged) {
    return current;
  }
  return { ...current, [slug]: { ...previous, ...patch } };
}

/**
 * Shares optimistic business display overrides (name + logo) across the app shell, so an edit made on
 * the business page reflects immediately in sibling surfaces that fetched their own copy — chiefly the
 * switcher in the business sidebar. Keyed by slug. The name tracks the live edit and reverts if a save
 * is abandoned; the logo is pushed once its upload has saved, so it simply persists.
 */
export function BusinessIdentityProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Overrides>({});

  const setName = useCallback((slug: string, name: string) => {
    setOverrides((current) => mergeOverride(current, slug, { name }));
  }, []);

  const setLogo = useCallback((slug: string, logo: string | null) => {
    setOverrides((current) => mergeOverride(current, slug, { logo }));
  }, []);

  const value = useMemo(
    () => ({ overrides, setName, setLogo }),
    [overrides, setName, setLogo],
  );

  return (
    <BusinessIdentityContext.Provider value={value}>
      {children}
    </BusinessIdentityContext.Provider>
  );
}

export function useBusinessIdentity(): BusinessIdentity | null {
  return useContext(BusinessIdentityContext);
}
