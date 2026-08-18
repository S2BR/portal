import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SUPER_ADMIN } from "@/lib/auth/roles";
import { currentAccessTokenRoles } from "@/lib/auth/session";

/**
 * The platform admin area. Gated server-side on the access token's verified `roles` claim (read
 * straight off the token, not the display cookie) — a non-admin gets a 404, revealing nothing. This
 * is a UX gate; every admin API endpoint enforces the same role, so it's the real boundary.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const roles = await currentAccessTokenRoles();
  if (!roles.includes(SUPER_ADMIN)) {
    notFound();
  }

  return (
    // Break out of the app shell's centered main so the rail sits flush at the viewport edge, like
    // the business workspace.
    <div className="mx-[calc(50%_-_50vw)] -mt-10 w-screen">
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar />
        <div className="min-w-0 flex-1 px-4 py-10 sm:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
