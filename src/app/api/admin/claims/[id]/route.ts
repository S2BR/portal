import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { AdminClaim } from "../route";

/** Reviewing a claim from the queue: the decision taken plus an optional internal note. */
interface ReviewBody {
  decision?: "approved" | "rejected";
  note?: string | null;
}

/**
 * BFF: approve or reject an ownership claim. Forwards the decision + note to the generic admin API
 * endpoint; the API records the operator and enforces the super_admin role (a 403 is surfaced here).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as ReviewBody;
  const decision = body.decision === "rejected" ? "rejected" : "approved";

  const response = await callWithAuth<
    { data: AdminClaim } & {
      message?: string;
      errors?: Record<string, string[]>;
      retry_after?: number | null;
    }
  >({
    method: "PATCH",
    path: `/admin/claims/${encodeURIComponent(id)}`,
    body: { decision, note: body.note ?? null },
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
