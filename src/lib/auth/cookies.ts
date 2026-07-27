/**
 * Names of the httpOnly session cookies set by our BFF route handlers. The
 * tokens themselves never reach browser JS — only these cookie names are shared
 * between the middleware (session presence check) and the auth handlers.
 */
export const ACCESS_COOKIE = "s2br_at";
export const REFRESH_COOKIE = "s2br_rt";
