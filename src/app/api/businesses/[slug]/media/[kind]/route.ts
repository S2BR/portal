import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

import type { Business } from "../../../route";

type RemoveResult = { business?: Business } & Partial<ApiError>;

/**
 * BFF: remove a business logo or banner. Forwards to the API's `DELETE
 * /businesses/{slug}/media/{kind}` and returns the updated business. `kind` is constrained to
 * `logo|banner`; anything else is rejected without calling the portal.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; kind: string }> },
): Promise<NextResponse> {
  const { slug, kind } = await params;
  if (kind !== "logo" && kind !== "banner") {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<RemoveResult>({
    method: "DELETE",
    path: `/businesses/${encodeURIComponent(slug)}/media/${kind}`,
  });

  if (response.ok) {
    return NextResponse.json({ business: response.data.business });
  }

  return NextResponse.json(
    { status: "error" },
    { status: response.status === 404 ? 404 : 502 },
  );
}
