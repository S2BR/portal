import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { AdminBrand, AdminBrandBody } from "../route";

/**
 * BFF: edit or delete one brand. Forwards to the admin API (super_admin enforced — a 403 surfaces here).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as AdminBrandBody;

  const response = await callWithAuth<
    { brand: AdminBrand } & { errors?: Record<string, string[]>; retry_after?: number | null }
  >({ method: "PATCH", path: `/admin/brands/${encodeURIComponent(id)}`, body });

  if (response.ok) {
    return NextResponse.json({ status: "ok", brand: response.data.brand });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  if (response.status === 422) {
    return NextResponse.json({ status: "invalid", errors: response.data.errors }, { status: 422 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const response = await callWithAuth<{ retry_after?: number | null }>({
    method: "DELETE",
    path: `/admin/brands/${encodeURIComponent(id)}`,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok" });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
