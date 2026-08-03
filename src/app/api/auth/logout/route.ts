import { NextResponse } from "next/server";
import { z } from "zod";

import {
  activateRefreshToken,
  revokeVaultedAccount,
} from "@/lib/auth/accounts";
import { portalFetch } from "@/lib/api/client";
import {
  clearAccounts,
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
  readAccounts,
  writeAccounts,
} from "@/lib/auth/session";

const bodySchema = z.object({ scope: z.enum(["current", "all"]).optional() });

/** Best-effort revoke the active session on the API (it needs the bearer token). */
async function revokeActive(): Promise<void> {
  const [accessToken, refreshToken] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
  ]);
  if (accessToken || refreshToken) {
    await portalFetch({
      method: "POST",
      path: "/auth/logout",
      token: accessToken,
      body: refreshToken ? { refresh_token: refreshToken } : undefined,
    }).catch(() => undefined);
  }
}

/**
 * BFF logout. `scope: "current"` (default) signs out only the active account and, if
 * others remain in the switcher, promotes the next one to active (`switched`); with no
 * others it fully signs out (`signed_out`). `scope: "all"` revokes every account and
 * clears everything (`signed_out`). The active session is always revoked server-side.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  const scope = parsed.success ? (parsed.data.scope ?? "current") : "current";

  await revokeActive();

  if (scope === "all") {
    const vault = await readAccounts();
    await Promise.all(
      vault.map((account) => revokeVaultedAccount(account.refresh_token)),
    );
    await clearSessionCookies();
    await clearAccounts();
    return NextResponse.json({ status: "signed_out" });
  }

  // Drop to the next signed-in account, skipping any whose token has expired.
  let vault = await readAccounts();
  while (vault.length > 0) {
    const next = vault[vault.length - 1]; // most recently added
    vault = vault.slice(0, -1);
    await writeAccounts(vault); // drop it from the vault whether or not it activates
    if (next && (await activateRefreshToken(next.refresh_token))) {
      return NextResponse.json({ status: "switched" });
    }
  }

  await clearSessionCookies();
  await clearAccounts();
  return NextResponse.json({ status: "signed_out" });
}
