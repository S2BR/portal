import type { ReactNode } from "react";

import { AppHeader } from "@/components/app-header";
import { CurrentUserProvider } from "@/components/auth/current-user";

/**
 * The authenticated app shell: the current-user context + the app header + a centered main.
 * Shared by the (app) route group (portal, profile) and the logged-in social home at `/`.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <CurrentUserProvider>
      <div className="flex min-h-svh flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
          {children}
        </main>
      </div>
    </CurrentUserProvider>
  );
}
