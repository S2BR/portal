import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";

/** A category node — a root ("category") carries its `subcategories`; a subcategory has a `parent_id`. */
export interface Category {
  id: number;
  slug: string;
  name: string;
  parent_id: number | null;
  subcategories?: Category[];
}

/**
 * BFF: the active category tree (roots with subcategories) for the picker, localized by the API.
 * Degrades to an empty list on an upstream failure.
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ categories?: Category[] }>({
    method: "GET",
    path: "/categories",
  });

  if (response.ok) {
    return NextResponse.json({ categories: response.data.categories ?? [] });
  }

  return NextResponse.json({ categories: [] }, { status: response.status });
}
