import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { AdminCategory } from "@/lib/marketplace/admin";
import { forwardMarketplaceAdmin } from "@/lib/marketplace/admin-forward";

/** BFF: every marketplace category for the admin editor (includes inactive). */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ categories?: AdminCategory[] }>({
    method: "GET",
    path: "/admin/marketplace/categories",
  });

  if (response.ok) {
    return NextResponse.json({ categories: response.data.categories ?? [] });
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ categories: [] }, { status: 502 });
}

export async function POST(request: Request): Promise<NextResponse> {
  return forwardMarketplaceAdmin(
    "POST",
    "/admin/marketplace/categories",
    await request.json(),
  );
}
