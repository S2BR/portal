import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";

/**
 * The origin location stamped on a session at login (from the forwarded client geo). Only the fields
 * the edge could resolve are present; `null` when none were.
 */
export interface SessionLocation {
  city?: string;
  region?: string;
  /** ISO 3166-1 alpha-2. */
  country?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
  postal_code?: string;
}

/** One account session — a device / login lineage, keyed by refresh-token family id. */
export interface Session {
  id: string;
  device_name: string | null;
  ip_address: string | null;
  location: SessionLocation | null;
  last_used_at: string | null;
  started_at: string | null;
  current: boolean;
}

/** BFF: list the account's active sessions. */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ sessions: Session[] }>({
    path: "/account/security/sessions",
  });

  if (!response.ok) {
    return NextResponse.json({ sessions: [] }, { status: 502 });
  }

  return NextResponse.json({ sessions: response.data.sessions });
}

/** BFF: sign out every session except the current one ("sign out everywhere else"). */
export async function DELETE(): Promise<NextResponse> {
  const response = await callWithAuth<{ revoked: number }>({
    method: "DELETE",
    path: "/account/security/sessions",
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok", revoked: response.data.revoked });
  }

  return NextResponse.json({ status: "error" }, { status: 502 });
}
