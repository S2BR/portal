import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({
  kind: z.enum(["logo", "banner", "gallery"]),
  content_type: z.string().min(1),
});

interface SignedUpload {
  url: string;
  headers: Record<string, string>;
  key: string;
}

/**
 * BFF: mint a presigned S3 PUT url for a business image (logo, banner, or gallery). The browser
 * then uploads the file DIRECTLY to `url` (never through here) and confirms via
 * POST /api/businesses/{slug}/media. A slug the user doesn't own is a 404 upstream, relayed.
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

  const response = await callWithAuth<SignedUpload & Partial<ApiError>>({
    method: "POST",
    path: `/businesses/${encodeURIComponent(slug)}/media/url`,
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json(response.data);
  }

  return NextResponse.json(
    { status: "invalid", message: response.data.message },
    { status: response.status === 404 ? 404 : 422 },
  );
}
