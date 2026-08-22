/**
 * Client-side operator metadata for the filter builder — mirrors the API's FilterOperator /
 * FilterFieldType. Labels are NOT here; they're translated in the UI via `filters.operators.<op>`.
 */

export type FilterFieldType = "select" | "text" | "number" | "date" | "entity";
export type Arity = "none" | "one" | "many" | "range";

/** Every operator → how many values it takes. */
export const OPERATORS: Record<string, Arity> = {
  is: "one",
  is_not: "one",
  is_any_of: "many",
  is_none_of: "many",
  empty: "none",
  not_empty: "none",
  contains: "one",
  not_contains: "one",
  starts_with: "one",
  ends_with: "one",
  eq: "one",
  neq: "one",
  gt: "one",
  gte: "one",
  lt: "one",
  lte: "one",
  between: "range",
  not_between: "range",
};

export function operatorArity(operator: string): Arity {
  return OPERATORS[operator] ?? "one";
}

/** The operators each field type permits, in menu order — matches FilterFieldType::operators() on the API. */
export const OPERATORS_BY_TYPE: Record<FilterFieldType, string[]> = {
  select: ["is", "is_not", "is_any_of", "is_none_of", "empty", "not_empty"],
  text: ["is", "is_not", "contains", "not_contains", "starts_with", "ends_with", "empty", "not_empty"],
  number: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "not_between", "empty", "not_empty"],
  date: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "not_between", "empty", "not_empty"],
  // An entity reference (a picked business/user) — a single async pick, or has/no attachment.
  entity: ["is", "is_not", "empty", "not_empty"],
};
