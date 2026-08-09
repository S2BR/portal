"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type BusinessNav = {
  /** True while a business sidebar is mounted — the header shows its mobile toggle only then. */
  present: boolean;
  setPresent: (value: boolean) => void;
  /** The mobile sidebar sheet's open state, driven by the header toggle. */
  open: boolean;
  setOpen: (value: boolean) => void;
};

const BusinessNavContext = createContext<BusinessNav | null>(null);

/**
 * Shares the business sidebar's mobile state between the (global) header toggle and the (nested)
 * business sidebar. Mounted once around the app shell so both sides see the same state.
 */
export function BusinessNavProvider({ children }: { children: ReactNode }) {
  const [present, setPresent] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <BusinessNavContext.Provider value={{ present, setPresent, open, setOpen }}>
      {children}
    </BusinessNavContext.Provider>
  );
}

export function useBusinessNav(): BusinessNav | null {
  return useContext(BusinessNavContext);
}
