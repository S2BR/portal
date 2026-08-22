import type { NextResponse } from "next/server";

import { forwardTaxonomy } from "@/lib/taxonomy/forward";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return forwardTaxonomy(
    "PUT",
    `/admin/amenities/${encodeURIComponent(id)}`,
    await request.json(),
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return forwardTaxonomy(
    "DELETE",
    `/admin/amenities/${encodeURIComponent(id)}`,
  );
}
