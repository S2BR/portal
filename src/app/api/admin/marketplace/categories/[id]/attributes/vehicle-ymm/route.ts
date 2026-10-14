import { NextResponse } from "next/server";

import { forwardMarketplaceAdmin } from "@/lib/marketplace/admin-forward";

/** BFF: add the cascading Year / Make / Model preset fields to a category. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return forwardMarketplaceAdmin(
    "POST",
    `/admin/marketplace/categories/${encodeURIComponent(id)}/attributes/vehicle-ymm`,
  );
}
