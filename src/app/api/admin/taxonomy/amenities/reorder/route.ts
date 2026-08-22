import type { NextResponse } from "next/server";

import { forwardTaxonomy } from "@/lib/taxonomy/forward";

export async function POST(request: Request): Promise<NextResponse> {
  return forwardTaxonomy(
    "POST",
    "/admin/amenities/reorder",
    await request.json(),
  );
}
