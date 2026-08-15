import { expect, it } from "vitest";

import { toCategoryNodes } from "./category-tree-nodes";

it("builds an id-keyed node tree from the taxonomy API tree", () => {
  const nodes = toCategoryNodes([
    {
      id: 1,
      name: "Food & Drink",
      subcategories: [
        { id: 2, name: "Restaurants" },
        { id: 3, name: "Cafés" },
      ],
    },
    { id: 4, name: "Automotive" },
  ]);

  expect(nodes).toEqual([
    {
      id: 1,
      label: "Food & Drink",
      children: [
        { id: 2, label: "Restaurants", children: [] },
        { id: 3, label: "Cafés", children: [] },
      ],
    },
    { id: 4, label: "Automotive", children: [] },
  ]);
});

it("returns an empty tree for no categories", () => {
  expect(toCategoryNodes([])).toEqual([]);
});
