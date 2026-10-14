import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { AdsPage } from "@/lib/marketplace/types";

const EMPTY_PAGE: AdsPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

/** BFF: the signed-in user's own ads (any status), paginated. Forwards `page`. */
export async function GET(request: Request): Promise<NextResponse> {
  const page = new URL(request.url).searchParams.get("page");

  const response = await callWithAuth<
    AdsPage & { retry_after?: number | null }
  >({
    method: "GET",
    path: `/marketplace/my-ads${page ? `?page=${encodeURIComponent(page)}` : ""}`,
  });

  if (response.ok) {
    return NextResponse.json(response.data);
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(EMPTY_PAGE);
}
