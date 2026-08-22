import { describe, expect, it } from "vitest";

import {
  taxonomyById,
  taxonomyLabels,
  toCategoryNodes,
} from "./category-tree-nodes";

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

describe("taxonomyLabels", () => {
  it("flattens category + amenity trees to an id→name map", () => {
    expect(
      taxonomyLabels([
        { id: 1, name: "Food", subcategories: [{ id: 2, name: "Bakeries" }] },
      ]),
    ).toEqual({ "1": "Food", "2": "Bakeries" });

    expect(
      taxonomyLabels([
        { id: 3, name: "Connectivity", amenities: [{ id: 4, name: "Wi-Fi" }] },
      ]),
    ).toEqual({ "3": "Connectivity", "4": "Wi-Fi" });
  });
});

describe("taxonomyById", () => {
  it("flattens a tree to an id→{slug,name} map", () => {
    expect(
      taxonomyById([
        {
          id: 1,
          slug: "food",
          name: "Food",
          subcategories: [{ id: 2, slug: "bakeries", name: "Bakeries" }],
        },
      ]),
    ).toEqual({
      "1": { slug: "food", name: "Food" },
      "2": { slug: "bakeries", name: "Bakeries" },
    });
  });
});
