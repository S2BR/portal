import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

import type { Business } from "../../route";

const bodySchema = z.object({
  kind: z.enum(["logo", "banner", "gallery"]),
  key: z.string().min(1),
});

type AttachResult = { business?: Business } & Partial<ApiError>;

/**
 * BFF: confirm a completed direct-to-S3 business image upload by its object key. The API
 * re-validates the object and persists it (logo/banner slot or gallery append), returning the
 * updated business. A slug the user doesn't own is a 404 upstream, relayed as-is.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<AttachResult>({
    method: "POST",
    path: `/businesses/${encodeURIComponent(slug)}/media`,
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({ business: response.data.business });
  }

  return NextResponse.json(
    { status: "invalid", message: response.data.message },
    { status: response.status === 404 ? 404 : 422 },
  );
}
