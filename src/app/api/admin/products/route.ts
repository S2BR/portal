import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

export type ModerationStatus = "draft" | "pending" | "approved" | "rejected";

export interface AdminProductVariant {
  id: string;
  label: string | null;
  size: string | null;
  barcode: string | null;
  image: string | null;
}

export interface AdminProductImage {
  id: string;
  url: string | null;
}

/** A catalog product in the admin editor. */
export interface AdminProduct {
  id: string;
  name: string;
  brand: string | null;
  is_homemade: boolean;
  is_private: boolean;
  description: string | null;
  moderation_status: ModerationStatus;
  family: { id: string; name: string } | null;
  variants: AdminProductVariant[];
  images: AdminProductImage[];
  categories: { id: number; name: Record<string, string> }[];
  created_at: string | null;
}

/** A catalog product row in the admin index. */
export interface AdminProductListItem {
  id: string;
  name: string;
  brand: string | null;
  is_homemade: boolean;
  is_private: boolean;
  moderation_status: ModerationStatus;
  /** Row thumbnail: the product's gallery image, else a SKU image, else null. */
  image: string | null;
  /** Number of SKU variants on the product. */
  sku_count: number;
  created_at: string | null;
}

export interface AdminProductsPage {
  data: AdminProductListItem[];
  meta: { current_page: number; last_page: number; total: number };
}

/** Creating/editing a product: scalar fields + SKU variants + category ids. */
export interface AdminProductBody {
  name?: string;
  brand?: string | null;
  /** Attach to a brand by public id (null detaches) — used by the brand detail page. */
  brand_id?: string | null;
  /** The family (line) this product joins, by name — resolved/created under its brand. */
  family?: string | null;
  /** Attach to a family by public id (null detaches) — used by the family detail page. */
  family_id?: string | null;
  is_homemade?: boolean;
  description?: string | null;
  moderation_status?: ModerationStatus;
  category_ids?: number[];
  variants?: {
    id?: string;
    label?: string | null;
    size?: string | null;
    barcode?: string | null;
    /** A remote OpenFoodFacts front-image url to import server-side for this SKU. */
    image_url?: string | null;
  }[];
}

/** What a barcode resolves to in OpenFoodFacts — enough to prefill a new SKU. */
export interface BarcodeLookupResult {
  barcode: string;
  name: string | null;
  brand: string | null;
  size: string | null;
  image_url: string | null;
}

const EMPTY: AdminProductsPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

/**
 * BFF: the operator catalog index. Forwards the query-builder params — `filter[…]`, `sort`, `page` (the
 * API is the real allow-list) — plus the `visibility` scope, to the admin API (super_admin enforced — a
 * 403 surfaces here). Degrades to an empty page on a blip.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of incoming.entries()) {
    const forwarded =
      key === "filter" ||
      (key.startsWith("filter[") && key.endsWith("]")) ||
      key === "sort" ||
      key === "page" ||
      key === "visibility" ||
      key === "q";
    if (forwarded && value) {
      query.append(key, value);
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const response = await callWithAuth<
    AdminProductsPage & { retry_after?: number | null }
  >({ method: "GET", path: `/admin/products${suffix}` });

  if (response.ok) {
    return NextResponse.json({
      data: response.data.data,
      meta: response.data.meta,
    });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(EMPTY, { status: 502 });
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as AdminProductBody;

  const response = await callWithAuth<
    { product: AdminProduct } & {
      errors?: Record<string, string[]>;
      retry_after?: number | null;
    }
  >({ method: "POST", path: "/admin/products", body });

  if (response.ok) {
    return NextResponse.json(
      { status: "ok", product: response.data.product },
      { status: 201 },
    );
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  if (response.status === 403) {
    return NextResponse.json({ message: "forbidden" }, { status: 403 });
  }
  if (response.status === 422) {
    return NextResponse.json(
      { status: "invalid", errors: response.data.errors },
      { status: 422 },
    );
  }
  return NextResponse.json({ status: "error" }, { status: 502 });
}
