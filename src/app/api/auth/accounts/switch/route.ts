import { NextResponse } from "next/server";
import { z } from "zod";

import { activateRefreshToken } from "@/lib/auth/accounts";
import {
  getRefreshToken,
  readAccounts,
  writeAccounts,
} from "@/lib/auth/session";

const bodySchema = z.object({
  id: z.number().int(),
  // The account being switched away from, supplied by the client (it already knows the
  // signed-in user). Display info only — the token comes from the cookie, server-side.
  current: z
    .object({ id: z.number().int(), name: z.string(), email: z.string() })
    .optional(),
});

/**
 * BFF: switch the active account to one already in the switcher vault. The previously active
 * account is moved into the vault — its refresh token read straight from the cookie, so the
 * switch never calls the API for the current session and therefore never rotates or clears it
 * (a failed switch simply leaves you signed in as you were). The target is then promoted:
 * refreshed (single-use) and made active. A target whose token has expired is dropped with 422.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const vault = await readAccounts();
  const target = vault.find((account) => account.id === parsed.data.id);
  if (!target) {
    return NextResponse.json({ status: "unknown_account" }, { status: 404 });
  }

  // Snapshot the current active account from the cookie (authoritative token) + the client's
  // display info — no API call, so nothing about the current session is touched here.
  const currentRefresh = await getRefreshToken();
  const previous =
    parsed.data.current && currentRefresh
      ? { ...parsed.data.current, refresh_token: currentRefresh }
      : null;

  if (!(await activateRefreshToken(target.refresh_token))) {
    // The target's stored session is dead — forget it; the current session is untouched.
    await writeAccounts(vault.filter((account) => account.id !== target.id));
    return NextResponse.json({ status: "expired" }, { status: 422 });
  }

  const next = vault.filter((account) => account.id !== target.id);
  if (previous && previous.id !== target.id) {
    next.push(previous);
  }
  await writeAccounts(next);

  return NextResponse.json({ status: "ok" });
}
