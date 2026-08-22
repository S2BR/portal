import { describe, expect, it } from "vitest";

import { toStarRows } from "./star-filter-rows";

describe("toStarRows", () => {
  const items = [
    { label: "all", value: "all-v", isRefined: false },
    { label: "4", value: "v4", isRefined: false },
    { label: "3", value: "v3", isRefined: true },
    { label: "2", value: "v2", isRefined: false },
    { label: "1", value: "v1", isRefined: false },
  ];

  it("builds ordered star rows (4→1) and surfaces the clear value", () => {
    const { rows, clearValue } = toStarRows(items);

    expect(clearValue).toBe("all-v");
    expect(rows).toEqual([
      { stars: 4, value: "v4", isRefined: false },
      { stars: 3, value: "v3", isRefined: true },
      { stars: 2, value: "v2", isRefined: false },
      { stars: 1, value: "v1", isRefined: false },
    ]);
  });

  it("ignores unknown labels and reports no clear value when there is no 'all' item", () => {
    const { rows, clearValue } = toStarRows([
      { label: "4", value: "v4", isRefined: false },
      { label: "junk", value: "vx", isRefined: false },
    ]);

    expect(clearValue).toBeNull();
    expect(rows).toEqual([{ stars: 4, value: "v4", isRefined: false }]);
  });
});
