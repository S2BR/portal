import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

interface Tier {
  id: string;
  key: string;
  name: string;
  min_points: number;
  perks: Record<string, unknown>;
}

/** The signed-in user's points, tier, progress to the next tier, perks, and recent history. */
export interface MyPoints {
  points: number;
  tier: Tier | null;
  next_tier: Tier | null;
  points_to_next: number | null;
  perks: Record<string, unknown>;
  recent: {
    id: string;
    action: string;
    points: number;
    subject_type: string | null;
    reason: string | null;
    reversed: boolean;
    created_at: string | null;
  }[];
}

/**
 * BFF: the caller's own points summary. Forwards to the authed API endpoint (the session's own token).
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<
    MyPoints & { retry_after?: number | null }
  >({ method: "GET", path: "/me/points" });

  if (response.ok) {
    return NextResponse.json(response.data);
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
