import type { NextResponse } from "next/server";

import { forwardMarketplaceAdmin } from "@/lib/marketplace/admin-forward";

export async function POST(request: Request): Promise<NextResponse> {
  return forwardMarketplaceAdmin(
    "POST",
    "/admin/marketplace/categories/reorder",
    await request.json(),
  );
}
