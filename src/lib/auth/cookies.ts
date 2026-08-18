/**
 * Names of the httpOnly session cookies set by our BFF route handlers. The
 * tokens themselves never reach browser JS — only these cookie names are shared
 * between the middleware (session presence check) and the auth handlers.
 */
export const ACCESS_COOKIE = "s2br_at";
export const REFRESH_COOKIE = "s2br_rt";
/**
 * The admin-panel session token (see the API's IssueAdminToken). A SEPARATE, longer-lived token that
 * ONLY gates the admin panel UI — it never authorizes an API action (those check the access token's
 * roles). Present only for admin-capable accounts; tied to the active account. httpOnly like the rest.
 */
export const ADMIN_COOKIE = "s2br_admin";
/**
 * The "vault" of the OTHER signed-in accounts (everything except the active one),
 * for multi-account switching. Holds each account's opaque refresh token + minimal
 * display info, httpOnly like the tokens beside it.
 */
export const ACCOUNTS_COOKIE = "s2br_accts";
/** Short-lived flag: the user is on `/login` to ADD an account, not replace the session. */
export const ADD_COOKIE = "s2br_add";
