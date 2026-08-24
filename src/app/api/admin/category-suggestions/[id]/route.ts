import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { AdminCategorySuggestion } from "../route";

/** Resolving a suggestion: the new status, plus (when actioned) the category linked + a note. */
interface ReviewBody {
  status?: "pending" | "actioned" | "dismissed";
  category_id?: number | null;
  review_note?: string | null;
}

/**
 * BFF: resolve a category suggestion (actioned / dismissed / reopened). Forwards to the admin API,
 * which stamps the reviewer and enforces super_admin (a 403 is surfaced here).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as ReviewBody;

  const response = await callWithAuth<
    { suggestion?: AdminCategorySuggestion } & {
      message?: string;
      errors?: Record<string, string[]>;
      retry_after?: number | null;
    }
  >({
    method: "PUT",
    path: `/admin/category-suggestions/${encodeURIComponent(id)}`,
    body: {
      status: body.status ?? "dismissed",
      category_id: body.category_id ?? null,
      review_note: body.review_note ?? null,
    },
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
  if (response.status === 422) {
    return NextResponse.json(
      { message: response.data.message, errors: response.data.errors },
      { status: 422 },
    );
  }
  return NextResponse.json({ message: "error" }, { status: 502 });
}
