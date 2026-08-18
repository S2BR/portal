import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** A reported resource's self-describing target summary (the admin UI turns it into a link). */
export interface ReportTarget {
  type: string;
  id: string;
  label: string;
  context: string | null;
}

/** A report as the moderation queue shows it. */
export interface AdminReport {
  id: string;
  reason: string;
  is_priority: boolean;
  status: string;
  details: string | null;
  reporter: { name: string | null };
  target: ReportTarget | null;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string | null;
}

export interface AdminReportsPage {
  data: AdminReport[];
  meta: { current_page: number; last_page: number; total: number };
}

const EMPTY: AdminReportsPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

const FILTERS = ["status", "reason", "type", "page"] as const;

/**
 * BFF: the operator moderation queue. Forwards the whitelisted filters to the admin API, which
 * enforces the super_admin role — a non-admin gets a 403 surfaced here. Degrades to an empty page
 * on an upstream blip so the surface stays intact.
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
    AdminReportsPage & { retry_after?: number | null; message?: string }
  >({ method: "GET", path: `/admin/reports${suffix}` });

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
