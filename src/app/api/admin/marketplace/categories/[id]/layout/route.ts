import type { NextResponse } from "next/server";

import { forwardMarketplaceAdmin } from "@/lib/marketplace/admin-forward";

/** BFF: save a category's post-form layout (super-admin; the API is the real gate + validator). */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return forwardMarketplaceAdmin(
    "PUT",
    `/admin/marketplace/categories/${encodeURIComponent(id)}/layout`,
    await request.json(),
  );
}
