import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** The resource an upload is bound to (a business, a user, …). */
export interface AdminUploadBound {
  type: string;
  id: string;
  label: string | null;
}

/** A single upload as the operator manager shows it. */
export interface AdminUpload {
  id: string;
  type: string;
  disk: string;
  size: number | null;
  mime: string | null;
  status: "pending" | "confirmed";
  uploader: { name: string | null };
  bound: AdminUploadBound | null;
  /** A short-lived presigned url for an image object, or null (non-image / gone). */
  preview: string | null;
  /** A short-lived presigned url that downloads the object (any type) with a friendly filename. */
  download: string;
  created_at: string | null;
}

/** Totals for the active filter set — how many uploads match and their combined byte size. */
export interface AdminUploadsSummary {
  count: number;
  size: number;
}

export interface AdminUploadsPage {
  data: AdminUpload[];
  meta: { current_page: number; last_page: number; total: number };
  summary: AdminUploadsSummary;
}

const EMPTY: AdminUploadsPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
  summary: { count: 0, size: 0 },
};

/**
 * BFF: the operator upload manager. Forwards the query-builder params — `filter[…]`, `sort`, `page`
 * — to the admin API, which is the real allow-list (it rejects any filter/sort it doesn't permit)
 * and enforces the super_admin role (a non-admin gets a 403 surfaced here). Degrades to an empty page
 * on an upstream blip so the surface stays intact.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of incoming.entries()) {
    const forwarded =
      key === "filter" || // the base64url rule tree (OR / nested groups)
      (key.startsWith("filter[") && key.endsWith("]")) ||
      key === "sort" ||
      key === "page";
    if (forwarded && value) {
      query.append(key, value);
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const response = await callWithAuth<
    AdminUploadsPage & { retry_after?: number | null; message?: string }
  >({ method: "GET", path: `/admin/uploads${suffix}` });

  if (response.ok) {
    return NextResponse.json({
      data: response.data.data,
      meta: response.data.meta,
      summary: response.data.summary,
    });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(EMPTY, { status: 502 });
}
