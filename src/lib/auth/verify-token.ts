import "server-only";

import { importSPKI, jwtVerify, type JWTPayload } from "jose";

import { env } from "@/env";

const ALGORITHM = "RS256";

/** The imported public key, memoized after first use. */
let keyPromise: ReturnType<typeof importSPKI> | null = null;

function portalPublicKey(): ReturnType<typeof importSPKI> {
  // No trust anchor → we cannot prove any response is genuine, so refuse.
  if (!env.PORTAL_JWT_PUBLIC_KEY) {
    throw new Error(
      "PORTAL_JWT_PUBLIC_KEY is not configured — refusing to establish a session without a trust anchor.",
    );
  }
  // Tolerate a `\n`-escaped PEM (common when the key is a single-line env var).
  const pem = env.PORTAL_JWT_PUBLIC_KEY.replace(/\\n/g, "\n");
  keyPromise ??= importSPKI(pem, ALGORITHM);
  return keyPromise;
}

/**
 * Cryptographically verify a portal access token before it is trusted. Only a
 * token actually signed by the portal's RS256 private key — with the expected
 * audience, issuer (when configured), and a live expiry — passes. A forged,
 * tampered, MITM'd, or misrouted response cannot produce one, so a session is
 * only ever established from a genuine portal answer; a plausible-looking
 * "200 + JSON" is not enough.
 *
 * Throws on any failure (missing key, bad signature, wrong audience/issuer,
 * expired), so callers fail closed.
 */
export async function verifyAccessToken(token: string): Promise<void> {
  await readVerifiedClaims(token);
}

/**
 * Verify a portal access token (as {@link verifyAccessToken}) and return its decoded claims. Throws
 * on any verification failure, so a caller only ever reads claims off a genuine, unexpired portal
 * token — never a forged or tampered one.
 */
export async function readVerifiedClaims(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, await portalPublicKey(), {
    algorithms: [ALGORITHM],
    audience: env.PORTAL_JWT_AUDIENCE,
    ...(env.PORTAL_JWT_ISSUER ? { issuer: env.PORTAL_JWT_ISSUER } : {}),
  });
  return payload;
}
