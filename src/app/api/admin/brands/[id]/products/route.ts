import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { AdminProductsPage } from "../../../products/route";

const EMPTY: AdminProductsPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

/**
 * BFF: the products carried by one brand, newest first, paginated. Forwards `?q=` (name filter) and
 * `?page=` to the admin API (super_admin enforced — a 403 surfaces here). Degrades to an empty page.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["q", "page"]) {
    const value = incoming.get(key);
    if (value) {
      query.append(key, value);
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const response = await callWithAuth<
    AdminProductsPage & { retry_after?: number | null }
  >({
    method: "GET",
    path: `/admin/brands/${encodeURIComponent(id)}/products${suffix}`,
  });

  if (response.ok) {
    return NextResponse.json({
      data: response.data.data,
      meta: response.data.meta,
    });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(EMPTY, { status: 502 });
}
