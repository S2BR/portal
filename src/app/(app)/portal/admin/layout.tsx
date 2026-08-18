import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AdminSessionExpired } from "@/components/admin/admin-session-expired";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { hasAdminPanelAccess } from "@/lib/auth/roles";
import { adminSessionActive } from "@/lib/auth/session";
import { decodeUser, USER_COOKIE } from "@/lib/auth/user-cookie";

/** The centered, full-width shell the admin area renders in (breaks out of the app shell's padding). */
function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-[calc(50%_-_50vw)] -mt-10 w-screen">
      <div className="flex flex-col sm:flex-row">{children}</div>
    </div>
  );
}

/**
 * The platform admin area. Gated on a live **admin-panel session** — a separate, longer-lived token
 * (see the API's IssueAdminToken), not the 15-minute access token — so it no longer 404s when that
 * access token silently lapses between refreshes. Three outcomes:
 *  - live admin session → the panel;
 *  - a still-signed-in admin whose session lapsed after ~1h idle → a one-click "re-enter" screen;
 *  - anyone else → `notFound()`, so the route stays hidden.
 * Every admin API endpoint still enforces the role, so this is a UX gate over a real boundary.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (await adminSessionActive()) {
    return (
      <AdminShell>
        <AdminSidebar />
        <div className="min-w-0 flex-1 px-4 py-10 sm:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </div>
      </AdminShell>
    );
  }

  // No live admin session. A still-signed-in admin (per the display cookie) just lapsed after
  // inactivity — offer a one-click re-enter. A genuine non-admin gets a 404.
  const user = decodeUser((await cookies()).get(USER_COOKIE)?.value);
  if (hasAdminPanelAccess(user)) {
    return (
      <AdminShell>
        <div className="min-w-0 flex-1 px-4 py-10 sm:px-8">
          <AdminSessionExpired />
        </div>
      </AdminShell>
    );
  }

  notFound();
}
