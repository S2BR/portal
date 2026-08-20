import { NextResponse } from "next/server";

import type { ClaimTarget } from "@/app/api/claims/route";
import { callWithAuth } from "@/lib/api/authed";

export interface ClaimablePage {
  data: ClaimTarget[];
}

/**
 * BFF: everything the signed-in user can claim across all types (by verified email match). Powers
 * the post-login "you can claim these" prompt. Degrades to an empty list on any upstream hiccup so
 * it never blocks the UI.
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<ClaimablePage>({
    method: "GET",
    path: "/claims/claimable",
  });

  if (response.ok) {
    return NextResponse.json({ data: response.data.data ?? [] });
  }
  return NextResponse.json(
    { data: [] },
    { status: response.status === 401 ? 401 : 200 },
  );
}
