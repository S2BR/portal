import type { ReactNode } from "react";

import { AppHeader } from "@/components/app-header";

/**
 * The authenticated app shell: the app header + a centered main. The current-user context lives in
 * the root layout (seeded from the display cookie, no API call). Route protection is handled by the
 * middleware (a missing session cookie on these paths redirects to sign-in), so the shell no longer
 * queries the API on every navigation.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
