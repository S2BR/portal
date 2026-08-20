import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError, AuthUser } from "@/lib/api/types";

// Removal carries only an optional target (avatar sends none; a business logo/gallery sends
// `{ business, image? }`).
const removeSchema = z.object({
  context: z.record(z.string(), z.unknown()).optional(),
});

const TYPE = /^[a-z][a-z0-9-]*$/;

type RemoveResult = { user?: AuthUser } & Partial<ApiError>;

/** BFF: remove the current object of this upload type (optionally a scoped target's). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
): Promise<NextResponse> {
  const { type } = await params;
  if (!TYPE.test(type)) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  // A body is optional (avatar sends none); when present it carries the scoped target.
  const parsed = removeSchema.safeParse(await request.json().catch(() => ({})));
  const context = parsed.success ? parsed.data.context : undefined;

  const response = await callWithAuth<RemoveResult>({
    method: "DELETE",
    path: `/uploads/${type}`,
    ...(context ? { body: { context } } : {}),
  });

  if (response.ok) {
    return NextResponse.json(response.data);
  }

  return NextResponse.json(
    { status: "invalid", message: response.data.message },
    { status: 422 },
  );
}
