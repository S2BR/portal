import { NextResponse } from "next/server";

import type { PublicBusinessCard } from "@/lib/public-business";
import { callWithAuth } from "@/lib/api/authed";

export interface ClaimablePage {
  data: PublicBusinessCard[];
}

/**
 * BFF: the businesses the signed-in user can claim by verified email match. Powers the post-login
 * "claim these" prompt. Degrades to an empty list on any upstream hiccup so it never blocks the UI.
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<ClaimablePage>({
    method: "GET",
    path: "/business-claims/claimable",
  });

  if (response.ok) {
    return NextResponse.json({ data: response.data.data ?? [] });
  }
  return NextResponse.json(
    { data: [] },
    { status: response.status === 401 ? 401 : 200 },
  );
}
