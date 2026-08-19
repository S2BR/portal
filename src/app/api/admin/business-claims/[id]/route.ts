import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { AdminClaim } from "../route";

/** Reviewing a claim from the queue: the action taken plus an optional internal note. */
interface ReviewBody {
  action?: "approve" | "reject";
  note?: string | null;
}

/**
 * BFF: approve or reject a business-ownership claim. Maps the action to the matching admin API
 * endpoint; the API records the operator + note and enforces the super_admin role (a 403 is
 * surfaced here).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as ReviewBody;
  const action = body.action === "reject" ? "reject" : "approve";

  const response = await callWithAuth<
    { data: AdminClaim } & {
      message?: string;
      errors?: Record<string, string[]>;
      retry_after?: number | null;
    }
  >({
    method: "PUT",
    path: `/admin/business-claims/${encodeURIComponent(id)}/${action}`,
    body: { note: body.note ?? null },
  });

  if (response.ok) {
    return NextResponse.json(response.data);
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  if (response.status === 422) {
    return NextResponse.json(
      { message: response.data.message, errors: response.data.errors },
      { status: 422 },
    );
  }
  return NextResponse.json({ message: "error" }, { status: 502 });
}
