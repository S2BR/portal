import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError, AuthUser } from "@/lib/api/types";

const bodySchema = z.object({
  upload: z.string().min(1),
  // Completed multipart parts (number + S3 ETag); absent for a single presigned POST.
  parts: z
    .array(z.object({ number: z.number().int().positive(), etag: z.string().min(1) }))
    .optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

const TYPE = /^[a-z][a-z0-9-]*$/;

type ConfirmResult = { user?: AuthUser } & Partial<ApiError>;

/**
 * BFF: confirm a completed direct-to-S3 upload by its ledger `upload` id (completing the multipart
 * upload from `parts` first, if any). The API re-validates the object, promotes it, and persists it,
 * returning the upload type's payload (e.g. the updated user).
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

  const response = await callWithAuth<ConfirmResult>({
    method: "POST",
    path: `/uploads/${type}/confirm`,
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
