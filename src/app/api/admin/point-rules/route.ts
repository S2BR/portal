import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

export type AwardTiming = "immediate" | "on_approval";

/** A gamification point rule — the operator-tunable reward for one action. */
export interface AdminPointRule {
  id: string;
  action: string;
  points: number;
  enabled: boolean;
  award_timing: AwardTiming;
  per_day_max: number | null;
  once_per_target: boolean;
  cooldown_seconds: number | null;
}

/** Editing a rule: any subset of its fields (`enabled` toggles it on/off). */
export interface AdminPointRuleBody {
  points?: number;
  enabled?: boolean;
  award_timing?: AwardTiming;
  per_day_max?: number | null;
  once_per_target?: boolean;
  cooldown_seconds?: number | null;
}

/**
 * BFF: the point-rule list. Forwards to the admin API (super_admin enforced — a 403 surfaces here).
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<
    { data: AdminPointRule[] } & { retry_after?: number | null }
  >({ method: "GET", path: "/admin/point-rules" });

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
