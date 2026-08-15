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
