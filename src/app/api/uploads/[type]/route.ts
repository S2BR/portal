import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError, AuthUser } from "@/lib/api/types";

const bodySchema = z.object({ key: z.string().min(1) });

const TYPE = /^[a-z][a-z0-9-]*$/;

type AttachResult = { user?: AuthUser } & Partial<ApiError>;

/**
 * BFF: confirm a completed direct-to-S3 upload by its object key. The API re-validates the
 * object and persists it, returning the upload type's payload (e.g. the updated user).
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

  const response = await callWithAuth<AttachResult>({
    method: "POST",
    path: `/uploads/${type}`,
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

/** BFF: remove the user's current object of this upload type. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
): Promise<NextResponse> {
  const { type } = await params;
  if (!TYPE.test(type)) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<AttachResult>({
    method: "DELETE",
    path: `/uploads/${type}`,
  });

  if (response.ok) {
    return NextResponse.json(response.data);
  }

  return NextResponse.json(
    { status: "invalid", message: response.data.message },
    { status: 422 },
  );
}
