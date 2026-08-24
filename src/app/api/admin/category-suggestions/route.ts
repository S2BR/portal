import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** A category suggestion as the operator review queue shows it. */
export interface AdminCategorySuggestion {
  id: number;
  text: string;
  status: "pending" | "actioned" | "dismissed";
  business: { id: string; name: string };
  /** The category created/linked when actioned; `name` is the translatable locale map. */
  category: { id: number; name: Record<string, string> } | null;
  review_note: string | null;
  created_at: string | null;
  reviewed_at: string | null;
}

export interface AdminSuggestionsPage {
  data: AdminCategorySuggestion[];
  meta: { current_page: number; last_page: number; total: number };
}

const EMPTY: AdminSuggestionsPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

const FILTERS = ["status", "page"] as const;

/**
 * BFF: the operator category-suggestion review queue. Forwards the whitelisted filters to the admin
 * API (which enforces super_admin — a 403 is surfaced here). Degrades to an empty page on a blip.
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
    AdminSuggestionsPage & { retry_after?: number | null; message?: string }
  >({ method: "GET", path: `/admin/category-suggestions${suffix}` });

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
