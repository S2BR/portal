import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { flattenCollection, type JsonApiCollection } from "@/lib/api/types";

/** One account session — a device / login lineage, keyed by refresh-token family id. */
export interface Session {
  id: string;
  device_name: string | null;
  ip_address: string | null;
  last_used_at: string | null;
  started_at: string | null;
  current: boolean;
}

type SessionAttributes = Omit<Session, "id">;

/** BFF: list the account's active sessions, flattened from the JSON:API collection. */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<JsonApiCollection<SessionAttributes>>({
    path: "/account/security/sessions",
  });

  if (!response.ok) {
    return NextResponse.json({ sessions: [] }, { status: 502 });
  }

  return NextResponse.json({ sessions: flattenCollection(response.data) });
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
