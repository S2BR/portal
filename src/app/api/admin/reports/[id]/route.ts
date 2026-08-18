import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { AdminReport } from "../route";

/** Closing a report from the queue: the action taken plus an optional internal note. */
interface ResolveBody {
  action?: "resolve" | "dismiss";
  note?: string | null;
}

/**
 * BFF: resolve or dismiss a report. Maps the action to the matching admin API endpoint; the API
 * records the operator + note and enforces the super_admin role (a 403 is surfaced here).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as ResolveBody;
  const action = body.action === "dismiss" ? "dismiss" : "resolve";

  const response = await callWithAuth<
    { data: AdminReport } & { message?: string }
  >({
    method: "PUT",
    path: `/admin/reports/${encodeURIComponent(id)}/${action}`,
    body: { note: body.note ?? null },
  });

  if (response.ok) {
    return NextResponse.json(response.data);
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(
    { message: response.status === 403 ? "forbidden" : "error" },
    { status: response.status === 403 ? 403 : 502 },
  );
}
