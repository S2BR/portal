import type { AuthUser } from "@/lib/api/types";

/** The platform all-access role. Carried in the access token's `roles` claim. */
export const SUPER_ADMIN = "super_admin";

/**
 * Whether the signed-in user holds the platform super-admin role. Pure — reads the `roles` the
 * session carried from the verified access token onto {@link AuthUser}. A UX gate only; every admin
 * API endpoint enforces the same role server-side.
 */
export function isSuperAdmin(user: AuthUser | null | undefined): boolean {
  return user?.roles?.includes(SUPER_ADMIN) ?? false;
}

/**
 * Whether the account may open the admin panel at all — super_admin today, and later "has any admin
 * role" (community admins, moderators, …). Mirrors the API's User::hasAdminPanelAccess(). Which
 * sections they then see is gated per-role inside the panel. UX only; the API enforces for real.
 */
export function hasAdminPanelAccess(
  user: AuthUser | null | undefined,
): boolean {
  return isSuperAdmin(user);
}
