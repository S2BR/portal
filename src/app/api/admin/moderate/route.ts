import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** A moderation override on a report's target, from the queue's row actions. */
interface ModerateBody {
  target?: "review" | "business";
  id?: string;
  action?: "hide" | "unhide" | "lock" | "unlock";
  reason?: string | null;
}

/** The API path for each (target, action) — anything else is an invalid combination. */
const ROUTES: Record<string, (id: string) => string> = {
  "review:hide": (id) => `/admin/reviews/${id}/hide`,
  "review:unhide": (id) => `/admin/reviews/${id}/unhide`,
  "business:lock": (id) => `/admin/businesses/${id}/lock`,
  "business:unlock": (id) => `/admin/businesses/${id}/unlock`,
};

/**
 * BFF: apply an operator override to a reported target (hide/unhide a review, lock/unlock a
 * business). Maps the target+action to the matching admin API endpoint, which enforces the
 * super_admin role. Report resolution is separate (see `reports/[id]`).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as ModerateBody;
  const build = ROUTES[`${body.target}:${body.action}`];

  if (!build || typeof body.id !== "string") {
    return NextResponse.json({ message: "invalid" }, { status: 400 });
  }

  const response = await callWithAuth<
    Record<string, unknown> & { message?: string }
  >({
    method: "PUT",
    path: build(encodeURIComponent(body.id)),
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
