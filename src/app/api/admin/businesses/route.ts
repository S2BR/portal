import { NextResponse } from "next/server";
import { z } from "zod";

import type { Business } from "@/app/api/businesses/route";
import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** An owner account as shown in the admin business surfaces. */
export interface AdminBusinessOwner {
  id: number;
  name: string;
  email: string;
}

/** A business row in the admin directory list. */
export interface AdminBusinessRow {
  id: string;
  slug: string;
  name: string;
  type: string;
  logo: string | null;
  rating_avg: number;
  rating_count: number;
  is_published: boolean;
  is_locked: boolean;
  is_claimed: boolean;
  is_deleted: boolean;
  owners: AdminBusinessOwner[];
  created_at: string | null;
}

export interface AdminBusinessesPage {
  data: AdminBusinessRow[];
  meta: { current_page: number; last_page: number; total: number };
}

const EMPTY: AdminBusinessesPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

const FILTERS = ["q", "status", "type", "page"] as const;

/**
 * BFF: the admin business directory. Forwards the whitelisted filters to the admin API (which
 * enforces super_admin — a non-admin gets a 403 surfaced here). Degrades to an empty page on a blip.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of FILTERS) {
    const value = incoming.get(key);
    if (value) {
      query.set(key, value);
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const response = await callWithAuth<
    AdminBusinessesPage & { retry_after?: number | null; message?: string }
  >({ method: "GET", path: `/admin/businesses${suffix}` });

  if (response.ok) {
    return NextResponse.json({
      data: response.data.data,
      meta: response.data.meta,
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

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  type: z.enum(["company", "self_employed"]),
});

/**
 * BFF: operator create of a business. Forwards to `POST /admin/businesses` (the API enforces
 * super_admin and starts the listing unclaimed) and returns the created business so the client can
 * open its admin editor. A 422 passes the API's `errors` bag straight through for inline feedback.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{
    business?: Business;
    message?: string;
    errors?: Record<string, string[]>;
    retry_after?: number | null;
  }>({ method: "POST", path: "/admin/businesses", body: parsed.data });

  if (response.ok) {
    return NextResponse.json({
      status: "ok",
      business: response.data.business,
    });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ status: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(
    {
      status: "invalid",
      message: response.data.message,
      errors: response.data.errors,
    },
    { status: response.status === 422 ? 422 : 502 },
  );
}
