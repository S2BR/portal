import { NextResponse } from "next/server";
import { z } from "zod";

import {
  activateRefreshToken,
  captureActiveAccount,
} from "@/lib/auth/accounts";
import { readAccounts, writeAccounts } from "@/lib/auth/session";

const bodySchema = z.object({ id: z.number().int() });

/**
 * BFF: switch the active account to one already in the switcher vault. The previously
 * active account is moved into the vault (its refresh token stays valid while idle) and
 * the target is promoted — refreshed (single-use) and made active. A target whose token
 * has since expired is dropped from the vault with a 422.
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

  // Snapshot the current active account BEFORE we overwrite the session, so it can be
  // vaulted. Null if the active session is already gone (we then just drop it).
  const previous = await captureActiveAccount();

  if (!(await activateRefreshToken(target.refresh_token))) {
    // The target's stored session is dead — forget it so the menu stops offering it.
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
