/**
 * Bridges the presentational pill {@link Filters} bar (a flat `FilterValue[]`) to the API's filter
 * contract by way of the existing {@link FilterQuery} serializer — so a pill bar drives the same
 * server-side `filter[…]` params the operator {@link import("./to-api-params").toApiParams} builder
 * does, byte-for-byte. Values are shaped/un-shaped per the operator's arity (many → array, range →
 * `[min, max]`, none → dropped).
 */

import type { FilterField, FilterValue } from "@/components/ui/filters";

import { operatorArity } from "./operators";
import {
  fromApiParams,
  toApiParams,
  type FilterQuery,
  type FilterRule,
} from "./to-api-params";

let sequence = 0;

/** A stable-enough pill id for a rule rehydrated from the URL. */
function pillId(): string {
  sequence += 1;
  return `p${Date.now().toString(36)}${sequence}`;
}

/** One pill → an API filter rule, its value shaped for the operator's arity. */
export function ruleFromPill(
  field: FilterField,
  filter: FilterValue,
): FilterRule {
  const arity = operatorArity(filter.operator);
  let value: unknown;
  if (arity === "none") {
    value = undefined;
  } else if (arity === "many") {
    value = Array.isArray(filter.value) ? filter.value : [];
  } else if (arity === "range") {
    const range = (filter.value as { min: unknown; max: unknown } | null) ?? {
      min: null,
      max: null,
    };
    value = [range.min ?? "", range.max ?? ""];
  } else {
    value = filter.value;
  }
  return { type: "rule", path: [field.id], operator: filter.operator, value };
}

/** An API filter rule → a pill, its value un-shaped for the field's value control (null if unmapped). */
export function pillFromRule(
  rule: FilterRule,
  fields: FilterField[],
): FilterValue | null {
  const field = fields.find((candidate) => candidate.id === rule.path[0]);
  if (!field) {
    return null;
  }
  const arity = operatorArity(rule.operator);
  let value: unknown;
  if (arity === "none") {
    value = null;
  } else if (arity === "many") {
    value = Array.isArray(rule.value) ? rule.value.map(String) : [];
  } else if (arity === "range") {
    const parts = Array.isArray(rule.value) ? rule.value : [];
    const min = parts[0] ?? null;
    const max = parts[1] ?? null;
    value =
      field.type === "number"
        ? {
            min: min === null || min === "" ? null : Number(min),
            max: max === null || max === "" ? null : Number(max),
          }
        : { min: min === "" ? null : min, max: max === "" ? null : max };
  } else if (field.type === "number") {
    value = rule.value === "" || rule.value == null ? null : Number(rule.value);
  } else {
    value = String(rule.value ?? "");
  }
  return { id: pillId(), field: field.id, operator: rule.operator, value };
}

/** Whether a rule carries an actual value — a freshly-added pill with none yet is not sent. */
export function ruleHasValue(rule: FilterRule): boolean {
  const arity = operatorArity(rule.operator);
  if (arity === "none") {
    return true;
  }
  if (arity === "many") {
    return Array.isArray(rule.value) && rule.value.length > 0;
  }
  if (arity === "range") {
    const parts = Array.isArray(rule.value) ? rule.value : [];
    return (parts[0] ?? "") !== "" || (parts[1] ?? "") !== "";
  }
  return rule.value !== "" && rule.value != null;
}

/**
 * A pill field that rides a top-level query param (a fuzzy `q` search, a `visibility` scope) rather than
 * a `filter[…]` column. The pill's operator is cosmetic; its value goes straight to `param`, and a value
 * equal to `default` is omitted (the API's default) so the URL stays clean.
 */
export interface ScopeSpec {
  field: string;
  param: string;
  default?: string;
}

/** Pill values → URL params: scope fields as top-level params, the rest as `filter[…]` columns. */
export function pillsToParams(
  values: FilterValue[],
  fields: FilterField[],
  scopes: ScopeSpec[] = [],
): URLSearchParams {
  const params = new URLSearchParams();
  const scopeFields = new Set(scopes.map((scope) => scope.field));
  for (const scope of scopes) {
    const pill = values.find((value) => value.field === scope.field);
    const value = pill?.value == null ? "" : String(pill.value).trim();
    if (value && value !== scope.default) {
      params.set(scope.param, value);
    }
  }
  const rules = values
    .filter((value) => !scopeFields.has(value.field))
    .map((value) => {
      const field = fields.find((candidate) => candidate.id === value.field);
      return field ? ruleFromPill(field, value) : null;
    })
    .filter((rule): rule is FilterRule => rule !== null && ruleHasValue(rule));
  if (rules.length > 0) {
    const query: FilterQuery = { type: "group", combinator: "and", rules };
    for (const [key, value] of toApiParams(query).entries()) {
      params.append(key, value);
    }
  }
  return params;
}

/** URL params → pill values (in `fields` order): scope params first where present, then the columns. */
export function paramsToPills(
  params: URLSearchParams,
  fields: FilterField[],
  scopes: ScopeSpec[] = [],
): FilterValue[] {
  const scopeByField = new Map(scopes.map((scope) => [scope.field, scope]));
  const parsed = fromApiParams(params).rules.filter(
    (rule): rule is FilterRule => rule.type === "rule",
  );
  const values: FilterValue[] = [];
  for (const field of fields) {
    const scope = scopeByField.get(field.id);
    if (scope) {
      const raw = params.get(scope.param);
      if (raw && raw !== scope.default) {
        values.push({
          id: field.id,
          field: field.id,
          operator: field.operators?.[0]?.id ?? "is",
          value: raw,
        });
      }
      continue;
    }
    const rule = parsed.find((candidate) => candidate.path[0] === field.id);
    if (rule) {
      const pill = pillFromRule(rule, fields);
      if (pill) {
        values.push(pill);
      }
    }
  }
  return values;
}
