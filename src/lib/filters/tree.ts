/**
 * The filter builder's field config + immutable tree operations. The tree is a {@see FilterQuery}
 * (a group of rules / nested groups); every node carries a stable `id` for React keys and updates.
 * These helpers return new trees, so the builder stays a controlled component.
 */

import {
  operatorArity,
  OPERATORS_BY_TYPE,
  type FilterFieldType,
} from "./operators";
import type {
  Combinator,
  FilterGroup,
  FilterNode,
  FilterQuery,
  FilterRule,
} from "./to-api-params";

/** A filterable field the builder offers. `options` supplies the choices for a `select` field. */
export interface FilterFieldDef {
  name: string;
  label: string;
  type: FilterFieldType;
  options?: { value: string; label: string }[];
  /** Shown as a quick facet in the simple filter view (select fields only). */
  quick?: boolean;
  /** For an `entity` field: the endpoint the async picker searches (`?q=` / `?refs=`). */
  searchPath?: string;
}

function newId(): string {
  return crypto.randomUUID();
}

export function findField(
  fields: FilterFieldDef[],
  name: string,
): FilterFieldDef | undefined {
  return fields.find((field) => field.name === name);
}

/** The default value for a fresh rule, by the operator's arity (empty → none, `["",""]` → range, …). */
export function defaultValue(operator: string): unknown {
  switch (operatorArity(operator)) {
    case "none":
      return undefined;
    case "many":
      return [];
    case "range":
      return ["", ""];
    default:
      return "";
  }
}

/** A fresh rule for a field, defaulting to the field type's first operator. */
export function ruleForField(field: FilterFieldDef): FilterRule {
  const operator = OPERATORS_BY_TYPE[field.type][0] ?? "is";
  return {
    type: "rule",
    id: newId(),
    path: [field.name],
    operator,
    value: defaultValue(operator),
  };
}

export function emptyQuery(): FilterQuery {
  return { type: "group", id: newId(), combinator: "and", rules: [] };
}

/** Ensure every node has an id (e.g. after rehydrating from the URL). */
export function withIds(node: FilterNode): FilterNode {
  const id = node.id ?? newId();
  if (node.type === "group") {
    return { ...node, id, rules: node.rules.map(withIds) };
  }
  return { ...node, id };
}

/** Add a node to the group with `groupId`. */
export function addToGroup(
  root: FilterQuery,
  groupId: string,
  node: FilterNode,
): FilterQuery {
  const walk = (group: FilterGroup): FilterGroup => ({
    ...group,
    rules:
      group.id === groupId
        ? [...group.rules, node]
        : group.rules.map((rule) => (rule.type === "group" ? walk(rule) : rule)),
  });
  return walk(root);
}

/** Replace the node with `id` by applying `patch`. */
export function updateNode(
  root: FilterQuery,
  id: string,
  patch: (node: FilterNode) => FilterNode,
): FilterQuery {
  const walk = (node: FilterNode): FilterNode => {
    const next = node.id === id ? patch(node) : node;
    if (next.type === "group") {
      return { ...next, rules: next.rules.map(walk) };
    }
    return next;
  };
  return walk(root) as FilterQuery;
}

/** Remove the node with `id` from wherever it sits. */
export function removeNode(root: FilterQuery, id: string): FilterQuery {
  const walk = (group: FilterGroup): FilterGroup => ({
    ...group,
    rules: group.rules
      .filter((rule) => rule.id !== id)
      .map((rule) => (rule.type === "group" ? walk(rule) : rule)),
  });
  return walk(root);
}

export function setCombinator(
  root: FilterQuery,
  groupId: string,
  combinator: Combinator,
): FilterQuery {
  return updateNode(root, groupId, (node) =>
    node.type === "group" ? { ...node, combinator } : node,
  );
}

/** How many leaf conditions the query holds (nested groups counted through). */
export function countRules(node: FilterNode): number {
  if (node.type === "group") {
    return node.rules.reduce((total, child) => total + countRules(child), 0);
  }
  return 1;
}

/**
 * Whether a query is representable in the SIMPLE facet view: a flat AND (no nested groups) whose every
 * rule is an `is_any_of` on one of the given quick fields. Anything else (an OR, a group, another
 * operator, a non-quick field) needs the advanced builder.
 */
export function isSimpleQuery(query: FilterQuery, quick: Set<string>): boolean {
  return query.rules.every(
    (node) =>
      node.type === "rule" &&
      node.operator === "is_any_of" &&
      quick.has(node.path.join(".")),
  );
}

/** The selected values for a quick field in the simple view (its `is_any_of` rule, or none). */
export function simpleValues(query: FilterQuery, field: string): string[] {
  const rule = query.rules.find(
    (node) => node.type === "rule" && node.path.join(".") === field,
  );
  return rule && rule.type === "rule" && Array.isArray(rule.value)
    ? (rule.value as string[])
    : [];
}

/** Upsert (or clear) a quick field's `is_any_of` values in a simple query. */
export function setSimpleField(
  query: FilterQuery,
  field: string,
  values: string[],
): FilterQuery {
  const rules = query.rules.filter(
    (node) => !(node.type === "rule" && node.path.join(".") === field),
  );
  if (values.length > 0) {
    rules.push({
      type: "rule",
      id: crypto.randomUUID(),
      path: [field],
      operator: "is_any_of",
      value: values,
    });
  }
  return { ...query, combinator: "and", rules };
}
