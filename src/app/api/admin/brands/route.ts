import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** A brand in the admin manager. */
export interface AdminBrand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  product_count: number;
  family_count: number;
  created_at: string | null;
}

export interface AdminBrandsPage {
  data: AdminBrand[];
  meta?: { current_page: number; last_page: number; total: number };
}

/** Creating/editing a brand. */
export interface AdminBrandBody {
  name?: string;
  description?: string | null;
}

const EMPTY: AdminBrandsPage = { data: [] };

/**
 * BFF: the brand manager index. Forwards the optional `?q` name filter to the admin API (super_admin
 * enforced — a 403 surfaces here). Degrades to an empty list on a blip.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const search = new URL(request.url).searchParams.get("q") ?? "";
  const suffix = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";

  const response = await callWithAuth<AdminBrandsPage & { retry_after?: number | null }>({
    method: "GET",
    path: `/admin/brands${suffix}`,
  });

  if (response.ok) {
    return NextResponse.json({ data: response.data.data, meta: response.data.meta });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(EMPTY, { status: 502 });
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as AdminBrandBody;

  const response = await callWithAuth<
    { brand: AdminBrand } & { errors?: Record<string, string[]>; retry_after?: number | null }
  >({ method: "POST", path: "/admin/brands", body });

  if (response.ok) {
    return NextResponse.json({ status: "ok", brand: response.data.brand }, { status: 201 });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  if (response.status === 422) {
    return NextResponse.json({ status: "invalid", errors: response.data.errors }, { status: 422 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
