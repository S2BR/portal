import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** A business-ownership claim as the admin review queue shows it. */
export interface AdminClaim {
  id: string;
  status: "pending" | "approved" | "rejected" | "auto_approved";
  method: "email_match" | "admin_review";
  claimant: { name: string | null; email: string | null };
  business: { id: string; name: string; slug: string; is_claimed: boolean };
  message: string | null;
  proof: string[];
  review_note: string | null;
  reviewer: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

export interface AdminClaimsPage {
  data: AdminClaim[];
  meta: { current_page: number; last_page: number; total: number };
}

const EMPTY: AdminClaimsPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

const FILTERS = ["status", "page"] as const;

/**
 * BFF: the operator business-claims review queue. Forwards the whitelisted filters to the admin API,
 * which enforces the super_admin role — a non-admin gets a 403 surfaced here. Degrades to an empty
 * page on an upstream blip so the surface stays intact.
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
    AdminClaimsPage & { retry_after?: number | null; message?: string }
  >({ method: "GET", path: `/admin/business-claims${suffix}` });

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
