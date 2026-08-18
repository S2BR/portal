import { NextResponse } from "next/server";

import { updateSchema } from "@/app/api/businesses/[slug]/route";
import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

import type { AdminBusiness } from "./types";

/**
 * BFF: read / edit / delete ANY business as an operator. Mirrors the owner `[slug]` route's envelope
 * ({business}, {status:"ok",business}) so the reused edit form works unchanged, but targets the admin
 * API (which enforces super_admin and reaches locked/unpublished/soft-deleted listings).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const response = await callWithAuth<{
    business: AdminBusiness;
    retry_after?: number | null;
    message?: string;
  }>({ method: "GET", path: `/admin/businesses/${encodeURIComponent(id)}` });

  if (response.ok) {
    return NextResponse.json({ business: response.data.business });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  if (response.status === 403) {
    return NextResponse.json({ status: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{
    business: AdminBusiness;
    message?: string;
    errors?: Record<string, string[]>;
    retry_after?: number | null;
  }>({
    method: "PATCH",
    path: `/admin/businesses/${encodeURIComponent(id)}`,
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({
      status: "ok",
      business: response.data.business,
    });
  }
  if (response.status === 404) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(
    {
      status: "invalid",
      message: response.data.message,
      errors: response.data.errors,
    },
    { status: response.status === 403 ? 403 : 422 },
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const response = await callWithAuth<{ retry_after?: number | null }>({
    method: "DELETE",
    path: `/admin/businesses/${encodeURIComponent(id)}`,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok" });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(
    { status: response.status === 403 ? "forbidden" : "error" },
    { status: response.status === 403 ? 403 : 502 },
  );
}
