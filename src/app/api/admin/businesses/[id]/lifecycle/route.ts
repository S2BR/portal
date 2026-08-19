import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

interface LifecycleBody {
  action?: "lock" | "unlock" | "publish" | "unpublish" | "restore";
  reason?: string | null;
}

const ACTIONS = new Set(["lock", "unlock", "publish", "unpublish", "restore"]);

/**
 * BFF: operator lifecycle overrides on a business the form can't do — lock/unlock, force
 * publish/unpublish (bypassing the owner publish requirements), and restore. Each maps to its admin
 * API endpoint (which records the action to the audit trail and enforces super_admin).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as LifecycleBody;

  if (!body.action || !ACTIONS.has(body.action)) {
    return NextResponse.json({ message: "invalid" }, { status: 400 });
  }

  const response = await callWithAuth<
    Record<string, unknown> & { message?: string }
  >({
    method: "PUT",
    path: `/admin/businesses/${encodeURIComponent(id)}/${body.action}`,
    body: { reason: body.reason ?? null },
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
