/**
 * Shared (non-client) helpers for the directory's category filter tree, so the server page can build
 * the tree and the client `CategoryTree` component + its test can consume the same types.
 */

export type CategoryNode = {
  id: number;
  label: string;
  children: CategoryNode[];
};

/** The taxonomy API tree (id + localized `name` + `subcategories`) → the id-keyed node shape. */
export function toCategoryNodes(
  categories: Array<{
    id: number;
    name: string;
    subcategories?: Array<{ id: number; name: string; subcategories?: unknown }>;
  }>,
): CategoryNode[] {
  return categories.map((category) => ({
    id: category.id,
    label: category.name,
    children: toCategoryNodes(
      (category.subcategories ?? []) as Parameters<typeof toCategoryNodes>[0],
    ),
  }));
}

/**
 * Flatten a category/amenity tree into a `{ id: localized name }` map, used to label the Typesense
 * facet values — the index stores ids (a slug rename never re-indexes). Recurses through the child
 * key (`subcategories` / `amenities`).
 */
export function taxonomyLabels(
  nodes: Array<{
    id: number;
    name: string;
    subcategories?: unknown;
    amenities?: unknown;
  }>,
): Record<string, string> {
  const labels: Record<string, string> = {};
  const walk = (list: typeof nodes) => {
    for (const node of list) {
      labels[String(node.id)] = node.name;
      const children = (node.subcategories ?? node.amenities) as
        | typeof nodes
        | undefined;
      if (Array.isArray(children)) {
        walk(children);
      }
    }
  };
  walk(nodes);
  return labels;
}

/**
 * Flatten a tree into a `{ id: { slug, name } }` map — for the directory card's category chips,
 * which resolve the indexed id to its localized name (+ slug, a stable key).
 */
export function taxonomyById(
  nodes: Array<{
    id: number;
    slug: string;
    name: string;
    subcategories?: unknown;
    amenities?: unknown;
  }>,
): Record<string, { slug: string; name: string }> {
  const map: Record<string, { slug: string; name: string }> = {};
  const walk = (list: typeof nodes) => {
    for (const node of list) {
      map[String(node.id)] = { slug: node.slug, name: node.name };
      const children = (node.subcategories ?? node.amenities) as
        | typeof nodes
        | undefined;
      if (Array.isArray(children)) {
        walk(children);
      }
    }
  };
  walk(nodes);
  return map;
}
