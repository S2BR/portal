// @vitest-environment node
// jose's WebCrypto operations need Node's realm (jsdom's cross-realm typed
// arrays break `instanceof Uint8Array`). The real code runs on the server.
import { beforeAll, describe, expect, it, vi } from "vitest";

import { exportSPKI, generateKeyPair, SignJWT } from "jose";

// A mutable mock env we fill in beforeAll once the test keypair exists.
const mock = vi.hoisted(() => ({
  env: {
    PORTAL_JWT_PUBLIC_KEY: "" as string,
    PORTAL_JWT_ISSUER: "https://portal.example" as string | undefined,
    PORTAL_JWT_AUDIENCE: "s2br-app",
  },
}));
vi.mock("@/env", () => mock);

import { verifyAccessToken } from "./verify-token";

let portalKeys: Awaited<ReturnType<typeof generateKeyPair>>;
let attackerKeys: Awaited<ReturnType<typeof generateKeyPair>>;

interface TokenOverrides {
  iss?: string;
  aud?: string;
  exp?: string;
  key?: CryptoKey;
}

async function token(overrides: TokenOverrides = {}): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: "v1" })
    .setIssuedAt()
    .setIssuer(overrides.iss ?? "https://portal.example")
    .setAudience(overrides.aud ?? "s2br-app")
    .setExpirationTime(overrides.exp ?? "15m")
    .sign(overrides.key ?? portalKeys.privateKey);
}

beforeAll(async () => {
  portalKeys = await generateKeyPair("RS256");
  attackerKeys = await generateKeyPair("RS256");
  mock.env.PORTAL_JWT_PUBLIC_KEY = await exportSPKI(portalKeys.publicKey);
});

describe("verifyAccessToken", () => {
  it("accepts a token the portal actually signed, with the right claims", async () => {
    await expect(verifyAccessToken(await token())).resolves.toBeUndefined();
  });

  it("rejects a token signed by a different key (forgery / rogue endpoint)", async () => {
    await expect(
      verifyAccessToken(await token({ key: attackerKeys.privateKey })),
    ).rejects.toThrow();
  });

  it("rejects a tampered token", async () => {
    const valid = await token();
    const tampered = `${valid.slice(0, -4)}${valid.slice(-4) === "AAAA" ? "BBBB" : "AAAA"}`;
    await expect(verifyAccessToken(tampered)).rejects.toThrow();
  });

  it("rejects a token minted for a different audience", async () => {
    await expect(
      verifyAccessToken(await token({ aud: "some-other-app" })),
    ).rejects.toThrow();
  });

  it("rejects a token from an unexpected issuer", async () => {
    await expect(
      verifyAccessToken(await token({ iss: "https://evil.example" })),
    ).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    await expect(
      verifyAccessToken(await token({ exp: "-1m" })),
    ).rejects.toThrow();
  });

  it("rejects outright when no public key is configured (fails closed)", async () => {
    const saved = mock.env.PORTAL_JWT_PUBLIC_KEY;
    mock.env.PORTAL_JWT_PUBLIC_KEY = "";
    try {
      await expect(verifyAccessToken(await token())).rejects.toThrow(
        /not configured/,
      );
    } finally {
      mock.env.PORTAL_JWT_PUBLIC_KEY = saved;
    }
  });
});
