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
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  • ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
