import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Run the server in UTC so any server-side Date is UTC, never the host machine's zone (Toronto in
// local dev). User-facing dates are formatted in the viewer's own timezone via next-intl; this just
// keeps the server's own clock neutral. A deploy that sets TZ explicitly is respected.
process.env.TZ ??= "UTC";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Baseline security headers applied to every response. A nonce-based
 * Content-Security-Policy arrives with the auth pages (it needs per-request
 * nonces via middleware); these are the safe, static baseline until then.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The legal pages read markdown from src/content at request time — make sure the standalone
  // build (Vercel) traces and bundles those files.
  outputFileTracingIncludes: {
    "/terms": ["./src/content/legal/**"],
    "/privacy": ["./src/content/legal/**"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
