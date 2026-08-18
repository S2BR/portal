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
