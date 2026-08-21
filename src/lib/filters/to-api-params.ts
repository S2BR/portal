/**
 * Compiles a reui-style filter rule tree into the API's HYBRID filter contract:
 * - a simple all-AND query of leaf rules → readable flat params (`filter[field][operator]=value`);
 * - anything with an OR, a nested group, or a repeated field+operator → a single base64url-encoded
 *   JSON rule tree (`filter=<blob>`), which the API's FilterTree compiles recursively.
 *
 * The tree shape mirrors reui's `FilterQuery` (a group of rules/nested groups); the API tree uses
 * `field` (from the rule's `path`) + a concrete `operator` (a `negated` rule resolves to its inverse).
 */

import { OPERATORS as ARITY } from "./operators";

export type Combinator = "and" | "or";

export interface FilterRule {
  type: "rule";
  /** Stable id for the builder (React keys + updates); ignored by the API. */
  id?: string;
  /** Field path, root first (`["status"]`, or `["name","first"]` for a nested attribute). */
  path: string[];
  operator: string;
  value?: unknown;
  /** A rule may flag negation instead of picking the inverse operator; we resolve it. */
  negated?: boolean;
}

export interface FilterGroup {
  type: "group";
  id?: string;
  combinator: Combinator;
  rules: FilterNode[];
}

export type FilterNode = FilterRule | FilterGroup;
export type FilterQuery = FilterGroup;

/** The API tree shape (what FilterTree on the server decodes). */
interface ApiRule {
  field: string;
  operator: string;
  value?: unknown;
}
interface ApiGroup {
  combinator: Combinator;
  rules: (ApiRule | ApiGroup)[];
}

/** The inverse operator a `negated` rule resolves to (operators without a clean inverse are left as-is). */
const INVERSE: Record<string, string> = {
  is: "is_not",
  is_not: "is",
  is_any_of: "is_none_of",
  is_none_of: "is_any_of",
  empty: "not_empty",
  not_empty: "empty",
  contains: "not_contains",
  not_contains: "contains",
  between: "not_between",
  not_between: "between",
  eq: "neq",
  neq: "eq",
};

function resolveOperator(operator: string, negated?: boolean): string {
  return negated && INVERSE[operator] ? INVERSE[operator] : operator;
}

function isGroup(node: FilterNode): node is FilterGroup {
  return node.type === "group";
}

/** reui node → API node (path → field, negated → inverse operator, recurse into groups). */
function toApiNode(node: FilterNode): ApiRule | ApiGroup {
  if (isGroup(node)) {
    return {
      combinator: node.combinator,
      rules: node.rules.map(toApiNode),
    };
  }
  return {
    field: node.path.join("."),
    operator: resolveOperator(node.operator, node.negated),
    value: node.value,
  };
}

function isApiRule(node: ApiRule | ApiGroup): node is ApiRule {
  return "field" in node;
}

/** Serialize a leaf rule's value for a flat param, per the operator's arity. */
function serializeValue(operator: string, value: unknown): string {
  switch (ARITY[operator] ?? "one") {
    case "none":
      return "true";
    case "many":
    case "range":
      return Array.isArray(value) ? value.map(String).join(",") : String(value ?? "");
    default:
      return String(value ?? "");
  }
}

/**
 * A tree is "flat-simple" (→ readable params) when the root combines with AND, every rule is a leaf,
 * and no field+operator repeats (a repeat can't coexist as two flat keys).
 */
function isFlatSimple(root: ApiGroup): root is ApiGroup & { rules: ApiRule[] } {
  if (root.combinator !== "and") {
    return false;
  }
  const seen = new Set<string>();
  for (const rule of root.rules) {
    if (!isApiRule(rule)) {
      return false;
    }
    const key = `${rule.field}[${rule.operator}]`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
  }
  return true;
}

/** UTF-8-safe base64url (no padding), matching the API's tolerant decoder. */
export function encodeTree(tree: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(tree));
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a base64url tree param (padded or not) back to its JSON. */
function decodeTree(param: string): unknown {
  const b64 = param.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** API node → builder node (field → path, recurse into groups). */
function fromApiNode(node: unknown): FilterNode {
  const record = (node ?? {}) as Record<string, unknown>;
  if (Array.isArray(record.rules)) {
    return {
      type: "group",
      combinator: record.combinator === "or" ? "or" : "and",
      rules: record.rules.map(fromApiNode),
    };
  }
  return {
    type: "rule",
    path: String(record.field ?? "").split("."),
    operator: String(record.operator ?? ""),
    value: record.value,
  };
}

/** A leaf rule from a flat `filter[field][operator]=raw`, splitting many/range values on commas. */
function leafFromFlat(field: string, operator: string, raw: string): FilterNode {
  const arity = ARITY[operator] ?? "one";
  let value: unknown;
  if (arity === "none") {
    value = undefined;
  } else if (arity === "many" || arity === "range") {
    value = raw.split(",").filter((entry) => entry !== "");
  } else {
    value = raw;
  }
  return { type: "rule", path: field.split("."), operator, value };
}

/**
 * Rehydrate a {@see FilterQuery} from URL params — the inverse of {@see toApiParams}, so a shared or
 * refreshed URL restores the builder. Reads the base64url tree from `filter`, or the flat
 * `filter[field][operator]=value` params (a bare `filter[field]=a,b` restores as `is_any_of`).
 */
export function fromApiParams(params: URLSearchParams): FilterQuery {
  const tree = params.get("filter");
  if (tree !== null) {
    const node = fromApiNode(decodeTree(tree));
    return node.type === "group" ? node : { type: "group", combinator: "and", rules: [node] };
  }

  const rules: FilterNode[] = [];
  for (const [key, raw] of params.entries()) {
    const withOperator = /^filter\[([^\]]+)\]\[([^\]]+)\]$/.exec(key);
    if (withOperator?.[1] && withOperator[2]) {
      rules.push(leafFromFlat(withOperator[1], withOperator[2], raw));
      continue;
    }
    const bare = /^filter\[([^\]]+)\]$/.exec(key);
    if (bare?.[1]) {
      rules.push(leafFromFlat(bare[1], "is_any_of", raw));
    }
  }
  return { type: "group", combinator: "and", rules };
}

/**
 * Compile a filter query into URLSearchParams carrying the API filter — flat `filter[field][op]`
 * params for a simple all-AND query, or a single `filter=<base64url tree>` otherwise. An empty query
 * yields empty params (no filtering).
 */
export function toApiParams(query: FilterQuery): URLSearchParams {
  const params = new URLSearchParams();
  const root = toApiNode(query);

  if (!isApiRule(root) && root.rules.length === 0) {
    return params;
  }
  if (!isApiRule(root) && isFlatSimple(root)) {
    for (const rule of root.rules) {
      params.append(
        `filter[${rule.field}][${rule.operator}]`,
        serializeValue(rule.operator, rule.value),
      );
    }
    return params;
  }

  params.set("filter", encodeTree(root));
  return params;
}
