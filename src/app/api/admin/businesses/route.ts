import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** An owner account as shown in the admin business surfaces. */
export interface AdminBusinessOwner {
  id: number;
  name: string;
  email: string;
}

/** A business row in the admin directory list. */
export interface AdminBusinessRow {
  id: string;
  slug: string;
  name: string;
  type: string;
  logo: string | null;
  rating_avg: number;
  rating_count: number;
  is_published: boolean;
  is_locked: boolean;
  is_claimed: boolean;
  is_deleted: boolean;
  owners: AdminBusinessOwner[];
  created_at: string | null;
}

export interface AdminBusinessesPage {
  data: AdminBusinessRow[];
  meta: { current_page: number; last_page: number; total: number };
}

const EMPTY: AdminBusinessesPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

const FILTERS = ["q", "status", "type", "page"] as const;

/**
 * BFF: the admin business directory. Forwards the whitelisted filters to the admin API (which
 * enforces super_admin — a non-admin gets a 403 surfaced here). Degrades to an empty page on a blip.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of FILTERS) {
    const value = incoming.get(key);
    if (value) {
      query.set(key, value);
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const response = await callWithAuth<
    AdminBusinessesPage & { retry_after?: number | null; message?: string }
  >({ method: "GET", path: `/admin/businesses${suffix}` });

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
