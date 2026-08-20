import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { UploadConfig } from "@/lib/uploads/upload";

const TYPE = /^[a-z][a-z0-9-]*$/;

/**
 * BFF: an upload type's client-facing limits (max_bytes, mime_types, max_files) — the source of
 * truth for the file picker, so the frontend hardcodes nothing. Proxies to the API.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> },
): Promise<NextResponse> {
  const { type } = await params;
  if (!TYPE.test(type)) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<UploadConfig>({
    method: "GET",
    path: `/uploads/${type}/config`,
  });

  if (response.ok) {
    return NextResponse.json(response.data);
  }
  return NextResponse.json(
    { status: "invalid" },
    { status: response.status === 404 ? 404 : 502 },
  );
}
