import type { NextResponse } from "next/server";

import { forwardMarketplaceAdmin } from "@/lib/marketplace/admin-forward";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return forwardMarketplaceAdmin(
    "POST",
    `/admin/marketplace/categories/${encodeURIComponent(id)}/attributes/reorder`,
    await request.json(),
  );
}
