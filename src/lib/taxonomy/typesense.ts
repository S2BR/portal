import type { Amenity } from "@/app/api/amenities/route";
import type { Category } from "@/app/api/categories/route";

/**
 * Loads the category + amenity trees for the business editor DIRECTLY from Typesense (browser →
 * search host), the same direct-to-Typesense model the public directory uses for businesses — no
 * Laravel/DB in the data path. A short-lived scoped key is minted once from `/api/search/key` and
 * cached until it nears expiry. Every failure degrades to an empty tree so the editor still renders.
 *
 * Requires the `categories` + `amenities` Scout collections to be populated (`scout:import`) and the
 * parent search key to grant access to them.
 */

type Credentials = { key: string; host: string };
type Doc = Record<string, unknown>;

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

/** Every document in a collection (small, curated taxonomy), ordered by the curated `order`. */
async function allDocuments(
  collection: string,
  creds: Credentials,
): Promise<Doc[]> {
  const base = creds.host.startsWith("http")
    ? creds.host
    : `https://${creds.host}`;
  // q=* returns everything; `query_by` is required syntactically but unused, so point it at `slug`
  // (a plain string field present on every doc — the name/description are nested objects now).
  const url =
    `${base}/collections/${collection}/documents/search` +
    `?q=*&query_by=slug&per_page=250&sort_by=order:asc`;
  try {
    const response = await fetch(url, {
      headers: { "X-TYPESENSE-API-KEY": creds.key },
    });
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as { hits?: { document: Doc }[] };
    return (data.hits ?? []).map((hit) => hit.document);
  } catch {
    return [];
  }
}

const str = (value: unknown): string =>
  typeof value === "string" ? value : "";
const parentId = (doc: Doc): number | null =>
  doc.parent_id ? Number(doc.parent_id) : null;

/** Resolve a locale-keyed object field (`name` / `description`) to the UI locale, falling back to en. */
const localized = (doc: Doc, field: string, apiLocale: string): string => {
  const value = doc[field];
  if (value && typeof value === "object") {
    const map = value as Record<string, unknown>;
    return str(map[apiLocale]) || str(map.en);
  }
  return "";
};

function buildCategories(docs: Doc[], apiLocale: string): Category[] {
  const byId = new Map<number, Category>(
    docs.map((doc) => [
      Number(doc.id),
      {
        id: Number(doc.id),
        slug: str(doc.slug),
        name: localized(doc, "name", apiLocale),
        parent_id: parentId(doc),
        subcategories: [],
      },
    ]),
  );

  const roots: Category[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id !== null ? byId.get(node.parent_id) : null;
    if (parent) {
      parent.subcategories!.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function buildAmenities(docs: Doc[], apiLocale: string): Amenity[] {
  const byId = new Map<number, Amenity>(
    docs.map((doc) => {
      const description = localized(doc, "description", apiLocale);
      return [
        Number(doc.id),
        {
          id: Number(doc.id),
          slug: str(doc.slug),
          name: localized(doc, "name", apiLocale),
          description: description === "" ? null : description,
          parent_id: parentId(doc),
          category_slugs: Array.isArray(doc.category_slugs)
            ? (doc.category_slugs as string[])
            : [],
          amenities: [],
        },
      ];
    }),
  );

  const roots: Amenity[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id !== null ? byId.get(node.parent_id) : null;
    if (parent) {
      parent.amenities!.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** The category + amenity trees for the editor, localized, straight from Typesense. */
export async function fetchTaxonomyFromTypesense(
  locale: string,
): Promise<{ categories: Category[]; amenities: Amenity[] }> {
  const creds = await credentials();
  if (!creds) {
    return { categories: [], amenities: [] };
  }
  const apiLocale = locale.replace("-", "_");
  const [categoryDocs, amenityDocs] = await Promise.all([
    allDocuments("categories", creds),
    allDocuments("amenities", creds),
  ]);
  return {
    categories: buildCategories(categoryDocs, apiLocale),
    amenities: buildAmenities(amenityDocs, apiLocale),
  };
}
