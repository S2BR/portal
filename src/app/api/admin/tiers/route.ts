import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** A gamification tier — a level reached at `min_points`, with data-driven `perks`. */
export interface AdminTier {
  id: string;
  key: string;
  /** The name resolved to the request locale (for display). */
  name: string;
  /** The full locale-keyed name map (API locale codes, e.g. `pt_BR`) — for editing. */
  name_translations: Record<string, string>;
  min_points: number;
  sort: number;
  perks: Record<string, unknown>;
}

/** Creating a tier. `name` is a locale-keyed map (API locale codes; the default `en` is required). */
export interface AdminTierBody {
  key: string;
  name: Record<string, string>;
  min_points: number;
  sort?: number;
  perks?: Record<string, unknown> | null;
}

/**
 * BFF: the tier list. Forwards to the admin API (super_admin enforced — a 403 surfaces here).
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<
    { data: AdminTier[] } & { retry_after?: number | null }
  >({ method: "GET", path: "/admin/tiers" });

  if (response.ok) {
    return NextResponse.json({ data: response.data.data });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ data: [] }, { status: 502 });
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as AdminTierBody;

  const response = await callWithAuth<
    { data: AdminTier } & {
      errors?: Record<string, string[]>;
      retry_after?: number | null;
    }
  >({ method: "POST", path: "/admin/tiers", body });

  if (response.ok) {
    return NextResponse.json({ tier: response.data.data }, { status: 201 });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  if (response.status === 422) {
    return NextResponse.json(
      { status: "invalid", errors: response.data.errors },
      { status: 422 },
    );
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
