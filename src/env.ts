import "server-only";

import { z } from "zod";

/**
 * Environment configuration — validated once, on the server only. Never import
 * this from a client component; the `server-only` guard will fail the build.
 * Every new knob is added here AND documented in `.env.example`.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  /** Portal API base URL, including the `/v1` version segment. */
  PORTAL_API_URL: z.url().default("https://portal.s2br.com/api/v1"),
  /** Secret used to sign/encrypt session cookies. Required in production. */
  SESSION_COOKIE_SECRET: z.string().min(32).optional(),
  /**
   * The portal's RS256 public key (PEM). The BFF verifies every access token's
   * signature against this pinned key BEFORE establishing a session, so a
   * forged, MITM'd, or misrouted response can never mint one. Newlines may be
   * written as `\n` on a single line. Must match the portal PORTAL_API_URL
   * points at; without it, sign-in fails closed.
   */
  PORTAL_JWT_PUBLIC_KEY: z.string().min(1).optional(),
  /** Expected access-token issuer (the portal's APP_URL). Verified when set. */
  PORTAL_JWT_ISSUER: z.string().min(1).optional(),
  /** Expected access-token audience (the portal's JWT_AUDIENCE). */
  PORTAL_JWT_AUDIENCE: z.string().min(1).default("s2br-app"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  • ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
