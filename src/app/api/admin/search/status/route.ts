import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** One Scout collection's status: how many docs are indexed in Typesense vs. rows in the database. */
export interface SearchCollectionStatus {
  key: string;
  collection: string;
  model: string;
  database_total: number;
  indexed: number | null;
  exists: boolean;
  /** ISO-8601 timestamp of the last admin re-sync, or null if never re-synced from here. */
  last_reindexed_at: string | null;
}

/** Node resource usage from Typesense's /metrics.json (bytes + CPU %). */
export interface SearchResources {
  memory_used_bytes: number;
  memory_total_bytes: number;
  disk_used_bytes: number;
  disk_total_bytes: number;
  cpu_active_percentage: number;
}

/** Typesense backend status: reachability, version, node resources, and per-collection counts. */
export interface SearchStatus {
  healthy: boolean;
  configured: boolean;
  host: string;
  version: string | null;
  resources: SearchResources | null;
  error: string | null;
  collections: SearchCollectionStatus[];
}

/**
 * BFF: Typesense status for the admin panel. Forwards to the admin API (super_admin enforced — a 403
 * surfaces here). The API already degrades gracefully, so a reachable-but-unhealthy Typesense comes back
 * as `healthy: false` with the DB totals still present.
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<
    SearchStatus & { retry_after?: number | null }
  >({
    method: "GET",
    path: "/admin/search/status",
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
  return NextResponse.json({ status: "error" }, { status: 502 });
}
