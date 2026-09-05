import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { ProductSection } from "../route";

interface SaveSectionBody {
  name: Record<string, string>;
}

/**
 * BFF: rename or delete one product section (owner). Forwards to the owner API, scoped to the business
 * the caller owns.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
): Promise<NextResponse> {
  const { slug, id } = await params;
  const body = (await request.json().catch(() => ({}))) as SaveSectionBody;

  const response = await callWithAuth<
    { section: ProductSection } & {
      errors?: Record<string, string[]>;
      retry_after?: number | null;
    }
  >({
    method: "PATCH",
    path: `/businesses/${encodeURIComponent(slug)}/product-sections/${encodeURIComponent(id)}`,
    body,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok", section: response.data.section });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  if (response.status === 422) {
    return NextResponse.json(
      { status: "invalid", errors: response.data.errors },
      { status: 422 },
    );
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
): Promise<NextResponse> {
  const { slug, id } = await params;

  const response = await callWithAuth<{ retry_after?: number | null }>({
    method: "DELETE",
    path: `/businesses/${encodeURIComponent(slug)}/product-sections/${encodeURIComponent(id)}`,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok" });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
