/**
 * Searches the product catalog DIRECTLY from the browser against Typesense — the same direct-to-search
 * model the public business directory uses, no Laravel/DB in the data path. A short-lived scoped key is
 * minted once from `/api/search/key` and cached until it nears expiry. Only SHARED + APPROVED products
 * are indexed, so this is safe to run with a public scoped key. Every failure degrades to an empty
 * list so the caller (the new-product dedup suggestions, the owner "add from catalog" picker) still
 * works.
 *
 * Requires the `products` Scout collection to be populated (`scout:import`) and the parent search key
 * to grant access to it.
 */

type Credentials = { key: string; host: string };
type Doc = Record<string, unknown>;

/** A SKU of a catalog product, for the "pick a size" picker. */
export interface CatalogVariant {
  id: string;
  label: string;
  barcode: string;
  /** The SKU's own image (presigned url); null when it has none — fall back to the product cover. */
  image: string | null;
}

/** A catalog product as a search hit — enough to recognize it and to add one of its SKUs. */
export interface CatalogHit {
  id: string;
  name: string;
  brand: string | null;
  family: string | null;
  sku_count: number;
  image: string | null;
  barcodes: string[];
  variants: CatalogVariant[];
}

let cached: { credentials: Credentials; expiresAt: number } | null = null;

async function credentials(): Promise<Credentials | null> {
  const now = Date.now() / 1000;
  if (cached && cached.expiresAt - 30 > now) {
    return cached.credentials;
  }
  try {
    const response = await fetch("/api/search/key");
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      key?: string;
      host?: string;
      expires_at?: number;
    };
    if (!data.key || !data.host) {
      return null;
    }
    cached = {
      credentials: { key: data.key, host: data.host },
      expiresAt: data.expires_at ?? now + 600,
    };
    return cached.credentials;
  } catch {
    return null;
  }
}

const str = (value: unknown): string =>
  typeof value === "string" ? value : "";

function toHit(doc: Doc): CatalogHit {
  const variants = Array.isArray(doc.variants) ? (doc.variants as Doc[]) : [];
  const barcodes = Array.isArray(doc.barcodes)
    ? (doc.barcodes as unknown[])
    : [];
  return {
    id: str(doc.id),
    name: str(doc.name),
    brand: str(doc.brand) || null,
    family: str(doc.family) || null,
    sku_count:
      typeof doc.sku_count === "number" ? doc.sku_count : variants.length,
    image: str(doc.image) || null,
    barcodes: barcodes.map(str).filter(Boolean),
    variants: variants.map((variant) => ({
      id: str(variant.id),
      label: str(variant.label),
      barcode: str(variant.barcode),
      image: str(variant.image) || null,
    })),
  };
}

/**
 * Catalog products matching `query` (name / brand / barcode), fuzzy and accent-tolerant. `excludeId`
 * drops one product (the one being edited). Empty query → no results.
 */
export async function searchCatalog(
  query: string,
  options?: { excludeId?: string; perPage?: number },
): Promise<CatalogHit[]> {
  const q = query.trim();
  if (q === "") {
    return [];
  }
  const creds = await credentials();
  if (!creds) {
    return [];
  }
  const base = creds.host.startsWith("http")
    ? creds.host
    : `https://${creds.host}`;
  const params = new URLSearchParams({
    q,
    query_by: "name,brand,barcodes",
    query_by_weights: "4,2,3",
    per_page: String(options?.perPage ?? 8),
  });
  try {
    const response = await fetch(
      `${base}/collections/products/documents/search?${params.toString()}`,
      { headers: { "X-TYPESENSE-API-KEY": creds.key } },
    );
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as { hits?: { document: Doc }[] };
    return (data.hits ?? [])
      .map((hit) => toHit(hit.document))
      .filter((hit) => hit.id !== "" && hit.id !== options?.excludeId);
  } catch {
    return [];
  }
}
