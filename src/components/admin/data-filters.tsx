"use client";

import { ListFilter } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { FilterBuilder } from "@/components/admin/filter-builder";
import {
  FilterMultiSelect,
  type FilterOption,
} from "@/components/admin/filter-multi-select";
import { FilterScopeSelect } from "@/components/admin/filter-scope-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fromApiParams,
  toApiParams,
  type FilterQuery,
} from "@/lib/filters/to-api-params";
import {
  countRules,
  emptyQuery,
  isSimpleQuery,
  setSimpleField,
  simpleValues,
  withIds,
  type FilterFieldDef,
} from "@/lib/filters/tree";

function isFilterKey(key: string): boolean {
  return key === "filter" || key.startsWith("filter[");
}

function filterParamsOf(params: URLSearchParams): URLSearchParams {
  const filter = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (isFilterKey(key)) {
      filter.append(key, value);
    }
  }
  return filter;
}

/**
 * A single-select scope facet (e.g. product visibility) that rides alongside the column filters. It is
 * NOT a `filter[…]` column op — it maps to its own top-level query param and defaults to `defaultValue`
 * (which drops the param). Shown next to the quick facets in both simple and advanced modes.
 */
export interface ScopeDef {
  /** The top-level query param this scope drives (e.g. "visibility"). */
  param: string;
  label: string;
  options: FilterOption[];
  /** The value that means "no constraint" — selecting it removes the param. */
  defaultValue: string;
}

/**
 * The reusable filter panel for any list page. Starts SIMPLE — a row of quick facet dropdowns for the
 * fields marked `quick` (plain "is any of" filters) — with a discreet Advanced link to the full
 * operator {@see FilterBuilder} (operators, ranges, AND/OR, nested groups). Both edit the same query,
 * kept in the URL (readable flat params for simple filters, a base64url tree for groups), so views are
 * shareable + refresh-safe; a link carrying a complex filter opens in Advanced automatically.
 *
 * `scopes` adds single-select scope facets (see {@see ScopeDef}) that sit with the quick facets but
 * drive their own top-level param rather than a column filter.
 */
export function DataFilters({
  fields,
  scopes = [],
}: {
  fields: FilterFieldDef[];
  scopes?: ScopeDef[];
}) {
  const t = useTranslations("filters");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const quickFields = fields.filter(
    (field) => field.quick && field.type === "select",
  );
  const quick = new Set(quickFields.map((field) => field.name));

  const [query, setQuery] = useState<FilterQuery>(
    () =>
      withIds(
        fromApiParams(
          filterParamsOf(new URLSearchParams(searchParams.toString())),
        ),
      ) as FilterQuery,
  );
  // null = follow the query (simple when it can be); true/false = the user's explicit choice.
  const [advanced, setAdvanced] = useState<boolean | null>(null);
  const appliedRef = useRef<string>(toApiParams(query).toString());

  useEffect(() => {
    const incoming = filterParamsOf(
      new URLSearchParams(searchParams.toString()),
    ).toString();
    if (incoming !== appliedRef.current) {
      appliedRef.current = incoming;
      setQuery(
        withIds(fromApiParams(new URLSearchParams(incoming))) as FilterQuery,
      );
    }
  }, [searchParams]);

  function apply(next: FilterQuery) {
    setQuery(next);
    const apiParams = toApiParams(next);
    appliedRef.current = apiParams.toString();

    const params = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      if (!isFilterKey(key) && key !== "page") {
        params.append(key, value);
      }
    }
    for (const [key, value] of apiParams.entries()) {
      params.append(key, value);
    }
    router.replace(
      params.toString() ? `${pathname}?${params.toString()}` : pathname,
      {
        scroll: false,
      },
    );
  }

  const canSimple = quickFields.length > 0 && isSimpleQuery(query, quick);
  const showAdvanced =
    quickFields.length === 0 ||
    (advanced === null ? !canSimple : advanced || !canSimple);
  const active = countRules(query);

  function setScope(scope: ScopeDef, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === scope.defaultValue) {
      params.delete(scope.param);
    } else {
      params.set(scope.param, value);
    }
    params.delete("page");
    router.replace(
      params.toString() ? `${pathname}?${params.toString()}` : pathname,
      {
        scroll: false,
      },
    );
  }

  const scopeFacets = scopes.map((scope) => (
    <FilterScopeSelect
      key={scope.param}
      label={scope.label}
      options={scope.options}
      value={searchParams.get(scope.param) ?? scope.defaultValue}
      onChange={(value) => setScope(scope, value)}
    />
  ));

  const clearAll = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={() => apply(emptyQuery())}
    >
      {t("clearAll")}
    </Button>
  );
  const modeLink = (label: string, next: boolean) => (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="text-muted-foreground h-auto px-1"
      onClick={() => setAdvanced(next)}
    >
      {label}
    </Button>
  );

  // SIMPLE — the quick facets sit plainly on the page, no card/header around them.
  if (!showAdvanced) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {scopeFacets}
        {quickFields.map((field) => (
          <FilterMultiSelect
            key={field.name}
            label={field.label}
            options={field.options ?? []}
            selected={simpleValues(query, field.name)}
            onChange={(values) =>
              apply(setSimpleField(query, field.name, values))
            }
            searchPlaceholder={t("search")}
            emptyLabel={t("noResults")}
          />
        ))}
        {active > 0 ? clearAll : null}
        {modeLink(t("advanced"), true)}
      </div>
    );
  }

  // ADVANCED — the full builder gets the panel treatment (header + card).
  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="bg-muted/30 flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-md">
            <ListFilter className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold">{t("title")}</span>
          {active > 0 ? (
            <Badge variant="neutral" className="tabular-nums">
              {active}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {scopeFacets}
          {active > 0 ? clearAll : null}
          {canSimple ? modeLink(t("simple"), false) : null}
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <FilterBuilder value={query} onChange={apply} fields={fields} />
      </div>
    </div>
  );
}
