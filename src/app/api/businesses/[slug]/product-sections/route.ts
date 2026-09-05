import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** A business's product section — a translatable name map, its order, and the ids of its products. */
export interface ProductSection {
  id: string;
  /** Locale-keyed translatable name (API locale keys, e.g. `en`, `pt_BR`). */
  name: Record<string, string>;
  order: number;
  /** The sighting ids in this section, in order (present on the owner list). */
  product_ids?: string[];
}

/** Body for creating/renaming a section — the translatable name map. */
interface SaveSectionBody {
  name: Record<string, string>;
}

/**
 * BFF: a business's product sections (owner). GET lists them; POST creates one. Forwards to the owner
 * API, which scopes to the business the caller owns (a non-owned slug 404s).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const response = await callWithAuth<{
    sections: ProductSection[];
    retry_after?: number | null;
  }>({
    method: "GET",
    path: `/businesses/${encodeURIComponent(slug)}/product-sections`,
  });

  if (response.ok) {
    return NextResponse.json({ sections: response.data.sections });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ sections: [] }, { status: 502 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as SaveSectionBody;

  const response = await callWithAuth<
    { section: ProductSection } & {
      errors?: Record<string, string[]>;
      retry_after?: number | null;
    }
  >({
    method: "POST",
    path: `/businesses/${encodeURIComponent(slug)}/product-sections`,
    body,
  });

  if (response.ok) {
    return NextResponse.json(
      { status: "ok", section: response.data.section },
      { status: 201 },
    );
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
