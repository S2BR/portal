import { describe, expect, it } from "vitest";

import { buildRenderPlan, type PublicFormLayout } from "@/lib/marketplace/layout";

const tokens = (plan: ReturnType<typeof buildRenderPlan>) =>
  plan.flatMap((section) => section.items.map((i) => `${i.kind}:${i.key}`));

describe("buildRenderPlan", () => {
  it("uses a default arrangement when there is no layout", () => {
    const plan = buildRenderPlan(null, ["mileage", "make"]);
    expect(plan).toHaveLength(1);
    const flat = tokens(plan);
    expect(flat).toContain("special:vin");
    expect(flat).toContain("core:title");
    expect(flat).toContain("core:images");
    expect(flat).toContain("attribute:mileage");
    expect(flat).toContain("attribute:make");
  });

  it("keeps a custom layout's order and widths", () => {
    const layout: PublicFormLayout = {
      sections: [
        {
          id: "s1",
          name: "Basics",
          items: [
            { kind: "core", key: "title", width: "full" },
            { kind: "attribute", key: "mileage", width: "half" },
          ],
        },
      ],
    };
    const plan = buildRenderPlan(layout, ["mileage"]);
    expect(plan[0]?.name).toBe("Basics");
    expect(plan[0]?.items[0]).toEqual({
      kind: "core",
      key: "title",
      width: "full",
    });
    expect(plan[0]?.items[1]?.width).toBe("half");
  });

  it("drops unknown field references", () => {
    const layout: PublicFormLayout = {
      sections: [
        {
          id: "s1",
          name: null,
          items: [
            { kind: "attribute", key: "ghost", width: "full" },
            { kind: "core", key: "bogus", width: "full" },
            { kind: "core", key: "title", width: "full" },
          ],
        },
      ],
    };
    const flat = tokens(buildRenderPlan(layout, ["mileage"]));
    expect(flat).not.toContain("attribute:ghost");
    expect(flat).not.toContain("core:bogus");
    expect(flat).toContain("core:title");
  });

  it("deduplicates a field placed more than once", () => {
    const layout: PublicFormLayout = {
      sections: [
        {
          id: "s1",
          name: null,
          items: [
            { kind: "core", key: "title", width: "full" },
            { kind: "core", key: "title", width: "half" },
          ],
        },
      ],
    };
    const flat = tokens(buildRenderPlan(layout, []));
    expect(flat.filter((t) => t === "core:title")).toHaveLength(1);
  });

  it("appends required core fields, images, and unplaced dynamic fields at the end", () => {
    const layout: PublicFormLayout = {
      sections: [
        {
          id: "s1",
          name: "Only title",
          items: [{ kind: "core", key: "title", width: "full" }],
        },
      ],
    };
    const plan = buildRenderPlan(layout, ["mileage", "make"]);
    const flat = tokens(plan);
    // Required core + images are never dropped.
    for (const key of ["description", "price", "contact", "images"]) {
      expect(flat).toContain(`core:${key}`);
    }
    // Unplaced dynamic fields are preserved.
    expect(flat).toContain("attribute:mileage");
    expect(flat).toContain("attribute:make");
    // Optional core fields that weren't placed stay out (VIN included — it is never auto-appended).
    expect(flat).not.toContain("core:condition");
    expect(flat).not.toContain("core:location");
    expect(flat).not.toContain("special:vin");
  });
});
