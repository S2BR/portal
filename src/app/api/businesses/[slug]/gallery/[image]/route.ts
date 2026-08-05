import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

import type { Business } from "../../../route";

type RemoveResult = { business?: Business } & Partial<ApiError>;

/**
 * BFF: remove a single business gallery image by id. Forwards to the API's `DELETE
 * /businesses/{slug}/gallery/{image}` and returns the updated business. The `image` segment
 * must be numeric.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; image: string }> },
): Promise<NextResponse> {
  const { slug, image } = await params;
  if (!/^\d+$/.test(image)) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<RemoveResult>({
    method: "DELETE",
    path: `/businesses/${encodeURIComponent(slug)}/gallery/${image}`,
  });

  if (response.ok) {
    return NextResponse.json({ business: response.data.business });
  }

  return NextResponse.json(
    { status: "error" },
    { status: response.status === 404 ? 404 : 502 },
  );
}
