import { describe, expect, it } from "vitest";

import {
  encodeTree,
  fromApiParams,
  toApiParams,
  type FilterGroup,
  type FilterNode,
} from "./to-api-params";

/** A leaf rule. */
function rule(
  field: string,
  operator: string,
  value?: unknown,
  negated?: boolean,
): FilterNode {
  return { type: "rule", path: [field], operator, value, negated };
}

/** A group. */
function group(combinator: "and" | "or", ...rules: FilterNode[]): FilterGroup {
  return { type: "group", combinator, rules };
}

/** Decode a base64url tree param back to its JSON (mirror of encodeTree). */
function decodeTree(param: string): unknown {
  const b64 = param.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
}

describe("toApiParams — flat (all-AND)", () => {
  it("emits a single operator-as-key param", () => {
    const params = toApiParams(group("and", rule("status", "is_none_of", ["confirmed"])));
    expect(params.toString()).toBe("filter%5Bstatus%5D%5Bis_none_of%5D=confirmed");
    expect(params.get("filter[status][is_none_of]")).toBe("confirmed");
  });

  it("joins many/range values with commas", () => {
    const params = toApiParams(
      group(
        "and",
        rule("type", "is_any_of", ["avatar", "claim-proof"]),
        rule("size", "between", [100, 2000]),
      ),
    );
    expect(params.get("filter[type][is_any_of]")).toBe("avatar,claim-proof");
    expect(params.get("filter[size][between]")).toBe("100,2000");
  });

  it("serializes a value-less operator as true", () => {
    const params = toApiParams(group("and", rule("mime", "empty")));
    expect(params.get("filter[mime][empty]")).toBe("true");
  });

  it("resolves a negated rule to its inverse operator", () => {
    const params = toApiParams(group("and", rule("status", "is", "confirmed", true)));
    expect(params.get("filter[status][is_not]")).toBe("confirmed");
    expect(params.get("filter[status][is]")).toBeNull();
  });

  it("keeps two conditions on one field as two flat params", () => {
    const params = toApiParams(
      group("and", rule("size", "gte", 1000), rule("size", "lt", 2000)),
    );
    expect(params.get("filter[size][gte]")).toBe("1000");
    expect(params.get("filter[size][lt]")).toBe("2000");
    expect(params.has("filter")).toBe(false);
  });

  it("yields empty params for an empty query", () => {
    expect(toApiParams(group("and")).toString()).toBe("");
  });
});

describe("toApiParams — tree (OR / nested / collisions)", () => {
  it("encodes an OR root as a base64url tree", () => {
    const params = toApiParams(
      group("or", rule("type", "is", "avatar"), rule("status", "is", "pending")),
    );
    expect(params.has("filter")).toBe(true);
    expect(decodeTree(params.get("filter") as string)).toEqual({
      combinator: "or",
      rules: [
        { field: "type", operator: "is", value: "avatar" },
        { field: "status", operator: "is", value: "pending" },
      ],
    });
  });

  it("encodes a nested group as a tree", () => {
    const params = toApiParams(
      group(
        "and",
        rule("status", "is", "confirmed"),
        group("or", rule("type", "is", "avatar"), rule("type", "is", "business-logo")),
      ),
    );
    expect(decodeTree(params.get("filter") as string)).toEqual({
      combinator: "and",
      rules: [
        { field: "status", operator: "is", value: "confirmed" },
        {
          combinator: "or",
          rules: [
            { field: "type", operator: "is", value: "avatar" },
            { field: "type", operator: "is", value: "business-logo" },
          ],
        },
      ],
    });
  });

  it("falls back to a tree when a field+operator repeats", () => {
    const params = toApiParams(
      group("and", rule("type", "is", "avatar"), rule("type", "is", "claim-proof")),
    );
    expect(params.has("filter")).toBe(true);
  });

  it("round-trips through encodeTree", () => {
    const tree = { combinator: "and", rules: [{ field: "a", operator: "is", value: "b" }] };
    expect(decodeTree(encodeTree(tree))).toEqual(tree);
  });
});

describe("fromApiParams — rehydrate the builder", () => {
  it("parses flat operator-as-key params", () => {
    const query = fromApiParams(
      new URLSearchParams("filter[status][is_none_of]=confirmed&filter[size][gt]=1000"),
    );
    expect(query).toEqual({
      type: "group",
      combinator: "and",
      rules: [
        { type: "rule", path: ["status"], operator: "is_none_of", value: ["confirmed"] },
        { type: "rule", path: ["size"], operator: "gt", value: "1000" },
      ],
    });
  });

  it("restores a bare filter as is_any_of", () => {
    const query = fromApiParams(new URLSearchParams("filter[type]=avatar,claim-proof"));
    expect(query.rules[0]).toEqual({
      type: "rule",
      path: ["type"],
      operator: "is_any_of",
      value: ["avatar", "claim-proof"],
    });
  });

  it("decodes a base64url tree back to a query", () => {
    const params = toApiParams(
      group("or", rule("type", "is", "avatar"), rule("status", "is", "pending")),
    );
    expect(fromApiParams(params)).toEqual({
      type: "group",
      combinator: "or",
      rules: [
        { type: "rule", path: ["type"], operator: "is", value: "avatar" },
        { type: "rule", path: ["status"], operator: "is", value: "pending" },
      ],
    });
  });
});

describe("round-trip toApiParams → fromApiParams", () => {
  it("survives a flat all-AND query (string values)", () => {
    const query = group(
      "and",
      rule("status", "is_none_of", ["confirmed"]),
      rule("mime", "contains", "image"),
      rule("mime", "empty"),
    );
    // `empty` carries no value once round-tripped.
    expect(fromApiParams(toApiParams(query))).toEqual({
      type: "group",
      combinator: "and",
      rules: [
        { type: "rule", path: ["status"], operator: "is_none_of", value: ["confirmed"] },
        { type: "rule", path: ["mime"], operator: "contains", value: "image" },
        { type: "rule", path: ["mime"], operator: "empty", value: undefined },
      ],
    });
  });

  it("survives a nested AND/OR tree", () => {
    const query = group(
      "and",
      rule("status", "is", "confirmed"),
      group("or", rule("type", "is", "avatar"), rule("type", "is", "business-logo")),
    );
    expect(fromApiParams(toApiParams(query))).toEqual(query);
  });
});
