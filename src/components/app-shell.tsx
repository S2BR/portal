import type { ReactNode } from "react";

import { AccountBoundary } from "@/components/auth/account-boundary";
import { AppHeader } from "@/components/app-header";

/**
 * The authenticated app shell: the app header + a centered main. The current-user context lives in
 * the root layout (seeded from the display cookie, no API call). Route protection is handled by the
 * middleware (a missing session cookie on these paths redirects to sign-in), so the shell no longer
 * queries the API on every navigation.
 *
 * The page content is wrapped in an {@link AccountBoundary} so switching accounts re-queries its
 * data (client-fetched too) without a full reload.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col pt-16">
      {/* Header is position: fixed (never scrolls away), so it's out of flow — pt-16 reserves its
          64px height so the content below isn't hidden behind it. */}
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <AccountBoundary>{children}</AccountBoundary>
      </main>
    </div>
  );
}
