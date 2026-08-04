import { NextResponse } from "next/server";

import { readAccounts } from "@/lib/auth/session";

/**
 * BFF: the OTHER signed-in accounts (everything except the active one) for the account
 * switcher. Read straight from the httpOnly vault cookie — no API call — and never
 * exposes the refresh tokens, only display info.
 */
export async function GET(): Promise<NextResponse> {
  const others = (await readAccounts()).map(({ id, name, email, avatar }) => ({
    id,
    name,
    email,
    avatar: avatar ?? null,
  }));

  return NextResponse.json({ others });
}
