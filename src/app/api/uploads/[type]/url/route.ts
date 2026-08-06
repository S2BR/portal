import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";

const bodySchema = z.object({
  content_type: z.string().min(1),
  // Optional target for scoped upload kinds (e.g. `{ business: slug }`); forwarded verbatim,
  // the API's upload type validates it.
  context: z.record(z.string(), z.unknown()).optional(),
});

const TYPE = /^[a-z][a-z0-9-]*$/;

interface SignedUpload {
  url: string;
  headers: Record<string, string>;
  key: string;
}

/**
 * BFF: mint a presigned S3 PUT url for an upload type. The browser then uploads the file
 * DIRECTLY to `url` (never through here) and confirms via POST /api/uploads/{type}.
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

  const response = await callWithAuth<SignedUpload & Partial<ApiError>>({
    method: "POST",
    path: `/uploads/${type}/url`,
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
