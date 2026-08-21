import { describe, expect, it } from "vitest";

import {
  addToGroup,
  emptyQuery,
  isSimpleQuery,
  removeNode,
  ruleForField,
  setCombinator,
  setSimpleField,
  simpleValues,
  updateNode,
  withIds,
  type FilterFieldDef,
} from "./tree";

const statusField: FilterFieldDef = {
  name: "status",
  label: "Status",
  type: "select",
  options: [{ value: "confirmed", label: "Confirmed" }],
};

describe("tree helpers", () => {
  it("builds a default rule for a field (first operator of its type)", () => {
    const rule = ruleForField(statusField);
    expect(rule.path).toEqual(["status"]);
    expect(rule.operator).toBe("is");
    expect(rule.id).toBeTruthy();
  });

  it("adds, updates, and removes a rule in the root group", () => {
    const root = emptyQuery();
    const rule = ruleForField(statusField);

    const added = addToGroup(root, root.id as string, rule);
    expect(added.rules).toHaveLength(1);

    const updated = updateNode(added, rule.id as string, (node) =>
      node.type === "rule" ? { ...node, operator: "is_none_of" } : node,
    );
    expect((updated.rules[0] as { operator: string }).operator).toBe("is_none_of");

    const removed = removeNode(updated, rule.id as string);
    expect(removed.rules).toHaveLength(0);
  });

  it("toggles a group's combinator", () => {
    const root = emptyQuery();
    expect(setCombinator(root, root.id as string, "or").combinator).toBe("or");
  });

  it("assigns ids to a hydrated tree", () => {
    const hydrated = withIds({
      type: "group",
      combinator: "and",
      rules: [{ type: "rule", path: ["status"], operator: "is", value: "x" }],
    });
    expect(hydrated.id).toBeTruthy();
    expect((hydrated as { rules: { id?: string }[] }).rules[0]?.id).toBeTruthy();
  });
});

describe("simple/advanced helpers", () => {
  const quick = new Set(["type", "status"]);

  it("recognizes a flat is_any_of query on quick fields as simple", () => {
    const simple = setSimpleField(emptyQuery(), "type", ["avatar"]);
    expect(isSimpleQuery(simple, quick)).toBe(true);
  });

  it("treats an operator/group/non-quick field as not simple", () => {
    const withOp = {
      type: "group" as const,
      combinator: "and" as const,
      rules: [{ type: "rule" as const, path: ["size"], operator: "gt", value: "10" }],
    };
    expect(isSimpleQuery(withOp, quick)).toBe(false);
  });

  it("upserts and clears a quick field's values", () => {
    let q = setSimpleField(emptyQuery(), "type", ["avatar", "claim-proof"]);
    expect(simpleValues(q, "type")).toEqual(["avatar", "claim-proof"]);
    q = setSimpleField(q, "type", []);
    expect(simpleValues(q, "type")).toEqual([]);
    expect(q.rules).toHaveLength(0);
  });
});
