import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/**
 * BFF: manually grant or claw back a user's points (signed amount + reason) — the abuse lever. Forwards
 * to the admin API (super_admin enforced — a 403 surfaces here).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    points: number;
    reason: string;
  };

  const response = await callWithAuth<
    { points: number } & {
      errors?: Record<string, string[]>;
      retry_after?: number | null;
    }
  >({
    method: "POST",
    path: `/admin/users/${encodeURIComponent(id)}/points/adjust`,
    body,
  });

  if (response.ok) {
    return NextResponse.json({ points: response.data.points });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  if (response.status === 422) {
    return NextResponse.json(
      { status: "invalid", errors: response.data.errors },
      { status: 422 },
    );
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
