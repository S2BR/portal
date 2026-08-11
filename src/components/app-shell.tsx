import type { ReactNode } from "react";

import { AccountBoundary } from "@/components/auth/account-boundary";
import { AppHeader } from "@/components/app-header";
import { BusinessIdentityProvider } from "@/components/business/business-identity-context";
import { BusinessNavProvider } from "@/components/business/business-nav-context";

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
    <BusinessNavProvider>
      <BusinessIdentityProvider>
        <div className="flex min-h-svh flex-col">
          <AppHeader />
          <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-10 sm:px-6">
            <AccountBoundary>{children}</AccountBoundary>
          </main>
        </div>
      </BusinessIdentityProvider>
    </BusinessNavProvider>
  );
}
