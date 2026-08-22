import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import type { AdminCategory } from "@/lib/taxonomy/admin";
import { forwardTaxonomy } from "@/lib/taxonomy/forward";

/** BFF: the full category tree for the admin editor (includes inactive nodes). */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ categories?: AdminCategory[] }>({
    method: "GET",
    path: "/admin/categories",
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
  return forwardTaxonomy("POST", "/admin/categories", await request.json());
}
