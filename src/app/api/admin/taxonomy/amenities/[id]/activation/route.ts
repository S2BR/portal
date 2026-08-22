import type { NextResponse } from "next/server";

import { forwardTaxonomy } from "@/lib/taxonomy/forward";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return forwardTaxonomy(
    "PUT",
    `/admin/amenities/${encodeURIComponent(id)}/activation`,
    await request.json(),
  );
}
