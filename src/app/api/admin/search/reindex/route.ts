import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** Which collections were queued for a re-sync, and whether it was a full rebuild. */
export interface ReindexResult {
  queued: string[];
  rebuild: boolean;
}

/**
 * BFF: queue a Typesense re-sync. `collection` is "all" or one collection key; `rebuild` flushes first.
 * Forwards to the admin API (super_admin enforced). The API queues the work, so a 202 means "accepted",
 * not "finished" — a worker processes it.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as {
    collection?: string;
    rebuild?: boolean;
  };

  const response = await callWithAuth<
    ReindexResult & { retry_after?: number | null }
  >({
    method: "POST",
    path: "/admin/search/reindex",
    body,
  });

  if (response.ok) {
    return NextResponse.json(response.data, { status: 202 });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  if (response.status === 422) {
    return NextResponse.json({ message: "invalid" }, { status: 422 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
