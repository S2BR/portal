"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type CompanyNav = {
  /** True while a company sidebar is mounted — the header shows its mobile toggle only then. */
  present: boolean;
  setPresent: (value: boolean) => void;
  /** The mobile sidebar sheet's open state, driven by the header toggle. */
  open: boolean;
  setOpen: (value: boolean) => void;
};

const CompanyNavContext = createContext<CompanyNav | null>(null);

/**
 * Shares the company sidebar's mobile state between the (global) header toggle and the (nested)
 * company sidebar. Mounted once around the app shell so both sides see the same state.
 */
export function CompanyNavProvider({ children }: { children: ReactNode }) {
  const [present, setPresent] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <CompanyNavContext.Provider value={{ present, setPresent, open, setOpen }}>
      {children}
    </CompanyNavContext.Provider>
  );
}

export function useCompanyNav(): CompanyNav | null {
  return useContext(CompanyNavContext);
}
