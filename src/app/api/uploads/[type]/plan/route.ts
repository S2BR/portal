import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({
  content_type: z.string().min(1),
  size: z.number().int().positive(),
  // Optional target for scoped upload kinds (e.g. `{ business: slug }`); forwarded verbatim,
  // the API's upload type validates it.
  context: z.record(z.string(), z.unknown()).optional(),
});

const TYPE = /^[a-z][a-z0-9-]*$/;

/**
 * BFF: mint an upload plan for a file. The API picks the mechanism by size and returns a
 * discriminated plan (a presigned POST, or a resumable multipart upload). The browser then uploads
 * DIRECTLY to S3 (never through here) and confirms via POST /api/uploads/{type}/confirm.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
): Promise<NextResponse> {
  const { type } = await params;
  if (!TYPE.test(type)) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<Record<string, unknown> & Partial<ApiError>>({
    method: "POST",
    path: `/uploads/${type}/plan`,
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
