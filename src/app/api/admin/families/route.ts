import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** A product family (line) in the admin manager. */
export interface AdminFamily {
  id: string;
  name: string;
  slug: string;
  brand: { id: string; name: string } | null;
  brand_id: string | null;
  description: string | null;
  product_count: number;
  created_at: string | null;
}

export interface AdminFamiliesPage {
  data: AdminFamily[];
  meta?: { current_page: number; last_page: number; total: number };
}

/** Creating/editing a family: name, its brand (by public id or name), description. */
export interface AdminFamilyBody {
  name?: string;
  brand_id?: string | null;
  brand?: string | null;
  description?: string | null;
}

const EMPTY: AdminFamiliesPage = { data: [] };

/**
 * BFF: the family manager index. Forwards the optional `?q` name filter to the admin API (super_admin
 * enforced — a 403 surfaces here). Degrades to an empty list on a blip.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const search = new URL(request.url).searchParams.get("q") ?? "";
  const suffix = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";

  const response = await callWithAuth<AdminFamiliesPage & { retry_after?: number | null }>({
    method: "GET",
    path: `/admin/families${suffix}`,
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
  const body = (await request.json().catch(() => ({}))) as AdminFamilyBody;

  const response = await callWithAuth<
    { family: AdminFamily } & { errors?: Record<string, string[]>; retry_after?: number | null }
  >({ method: "POST", path: "/admin/families", body });

  if (response.ok) {
    return NextResponse.json({ status: "ok", family: response.data.family }, { status: 201 });
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
