import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** The gamification master switch: the stored override (null = follow config) + the effective value. */
export interface GamificationSettings {
  enabled: boolean | null;
  effective: boolean;
}

/**
 * BFF: read or set the gamification master switch. Forwards to the admin API (super_admin enforced —
 * a 403 surfaces here).
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<
    GamificationSettings & { retry_after?: number | null }
  >({ method: "GET", path: "/admin/gamification/settings" });

  if (response.ok) {
    return NextResponse.json({
      enabled: response.data.enabled,
      effective: response.data.effective,
    });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as {
    enabled: boolean | null;
  };

  const response = await callWithAuth<
    GamificationSettings & { retry_after?: number | null }
  >({ method: "PATCH", path: "/admin/gamification/settings", body });

  if (response.ok) {
    return NextResponse.json({
      enabled: response.data.enabled,
      effective: response.data.effective,
    });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
