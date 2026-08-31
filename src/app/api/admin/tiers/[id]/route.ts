import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { AdminTier } from "../route";

/** Editing a tier (key is immutable). `name` is a locale-keyed map (API locale codes). */
export interface AdminTierUpdateBody {
  name?: Record<string, string>;
  min_points?: number;
  sort?: number;
  perks?: Record<string, unknown> | null;
}

/**
 * BFF: edit or delete a tier. Forwards to the admin API (super_admin enforced — a 403 surfaces here).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as AdminTierUpdateBody;

  const response = await callWithAuth<
    { data: AdminTier } & {
      errors?: Record<string, string[]>;
      retry_after?: number | null;
    }
  >({ method: "PATCH", path: `/admin/tiers/${encodeURIComponent(id)}`, body });

  if (response.ok) {
    return NextResponse.json({ tier: response.data.data });
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const response = await callWithAuth<{ retry_after?: number | null }>({
    method: "DELETE",
    path: `/admin/tiers/${encodeURIComponent(id)}`,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok" });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
