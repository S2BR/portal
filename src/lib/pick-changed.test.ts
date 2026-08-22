import { describe, expect, it } from "vitest";

import { pickChanged } from "./pick-changed";

describe("pickChanged", () => {
  it("returns only the keys that differ", () => {
    const baseline = { name: "Acme", headline: "Old", type: "company" };
    const current = { name: "Acme", headline: "New", type: "company" };
    expect(pickChanged(current, baseline)).toEqual({ headline: "New" });
  });

  it("returns an empty object when nothing changed", () => {
    const value = { name: "Acme", tags: ["a", "b"], meta: { x: 1 } };
    expect(pickChanged({ ...value }, { ...value })).toEqual({});
  });

  it("detects changes deep inside arrays and objects", () => {
    const baseline = {
      contacts: [{ id: "1", value: "a@x.test" }],
      colors: { primary: "#000000" },
    };
    const current = {
      contacts: [{ id: "1", value: "b@x.test" }],
      colors: { primary: "#000000" },
    };
    expect(pickChanged(current, baseline)).toEqual({
      contacts: [{ id: "1", value: "b@x.test" }],
    });
  });

  it("treats a reordered array as a change (order is significant)", () => {
    const baseline = { ids: [1, 2, 3] };
    const current = { ids: [3, 2, 1] };
    expect(pickChanged(current, baseline)).toEqual({ ids: [3, 2, 1] });
  });
});
