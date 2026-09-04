"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { EntityCombobox } from "@/components/admin/entity-combobox";
import {
  FilterMultiSelect,
  type FilterOption,
} from "@/components/admin/filter-multi-select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OPERATORS_BY_TYPE, operatorArity } from "@/lib/filters/operators";
import type {
  Combinator,
  FilterGroup,
  FilterQuery,
  FilterRule,
} from "@/lib/filters/to-api-params";
import {
  addToGroup,
  defaultValue,
  emptyQuery,
  findField,
  removeNode,
  ruleForField,
  setCombinator,
  updateNode,
  type FilterFieldDef,
} from "@/lib/filters/tree";
import { cn } from "@/lib/utils";

const MAX_DEPTH = 2;
/** The combinator rail width, so the add-row footer lines up with the conditions. */
const RAIL = "w-16 shrink-0";

type Labels = ReturnType<typeof useTranslations>;

/**
 * A recursive filter builder on our shadcn/Radix components, laid out like a real query builder: a
 * left combinator rail (Where / And·Or) threads the conditions of each group, rules are tidy rows
 * (field → operator → value), and groups nest. Fully controlled — every edit produces a new query via
 * the pure tree helpers and calls `onChange`; the result compiles to the API filter via `toApiParams`.
 */
export function FilterBuilder({
  value,
  onChange,
  fields,
}: {
  value: FilterQuery;
  onChange: (query: FilterQuery) => void;
  fields: FilterFieldDef[];
}) {
  const t = useTranslations("filters");
  return (
    <GroupEditor
      group={value}
      root={value}
      onChange={onChange}
      fields={fields}
      depth={0}
      t={t}
    />
  );
}

function GroupEditor({
  group,
  root,
  onChange,
  fields,
  depth,
  t,
}: {
  group: FilterGroup;
  root: FilterQuery;
  onChange: (query: FilterQuery) => void;
  fields: FilterFieldDef[];
  depth: number;
  t: Labels;
}) {
  const isRoot = depth === 0;
  const groupId = group.id as string;

  const body = (
    <div className="space-y-1.5">
      {isRoot && group.rules.length === 0 ? (
        <p className="text-muted-foreground py-1 text-sm">{t("emptyHint")}</p>
      ) : null}

      {group.rules.map((node, index) => (
        <div key={node.id} className="flex items-start gap-2">
          <RailCell
            index={index}
            combinator={group.combinator}
            onCombinator={(combinator) =>
              onChange(setCombinator(root, groupId, combinator))
            }
            t={t}
          />
          <div className="min-w-0 flex-1">
            {node.type === "group" ? (
              <GroupEditor
                group={node}
                root={root}
                onChange={onChange}
                fields={fields}
                depth={depth + 1}
                t={t}
              />
            ) : (
              <RuleRow
                rule={node}
                root={root}
                onChange={onChange}
                fields={fields}
                t={t}
              />
            )}
          </div>
        </div>
      ))}

      <div className={cn("flex flex-wrap items-center gap-1.5", "ps-[4.5rem]")}>
        <AddFieldMenu
          fields={fields}
          onPick={(field) =>
            onChange(addToGroup(root, groupId, ruleForField(field)))
          }
          label={t("addFilter")}
        />
        {depth < MAX_DEPTH ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1"
            onClick={() => onChange(addToGroup(root, groupId, emptyQuery()))}
          >
            <Plus className="size-3.5" />
            {t("addGroup")}
          </Button>
        ) : null}
        {!isRoot ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground ms-auto"
            onClick={() => onChange(removeNode(root, groupId))}
          >
            {t("removeGroup")}
          </Button>
        ) : null}
      </div>
    </div>
  );

  return isRoot ? (
    body
  ) : (
    <div className="bg-muted/40 rounded-lg border p-2.5">{body}</div>
  );
}

/** The left rail cell: "Where" on the first row, an And/Or select on the second, static after. */
function RailCell({
  index,
  combinator,
  onCombinator,
  t,
}: {
  index: number;
  combinator: Combinator;
  onCombinator: (value: Combinator) => void;
  t: Labels;
}) {
  return (
    <div className={cn(RAIL, "flex justify-end pt-1.5")}>
      {index === 0 ? (
        <span className="text-muted-foreground pe-1 text-xs font-medium tracking-wide uppercase">
          {t("where")}
        </span>
      ) : index === 1 ? (
        <Select
          value={combinator}
          onValueChange={(value) => onCombinator(value as Combinator)}
        >
          <SelectTrigger className="h-7 w-full px-2 text-xs font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">{t("and")}</SelectItem>
            <SelectItem value="or">{t("or")}</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <span className="text-muted-foreground/70 pe-2 text-xs">
          {t(combinator)}
        </span>
      )}
    </div>
  );
}

function RuleRow({
  rule,
  root,
  onChange,
  fields,
  t,
}: {
  rule: FilterRule;
  root: FilterQuery;
  onChange: (query: FilterQuery) => void;
  fields: FilterFieldDef[];
  t: Labels;
}) {
  const ruleId = rule.id as string;
  const field = findField(fields, rule.path.join("."));
  const operators = field ? OPERATORS_BY_TYPE[field.type] : [];

  function pickField(name: string) {
    const next = findField(fields, name);
    if (next) {
      onChange(
        updateNode(root, ruleId, () => ({ ...ruleForField(next), id: ruleId })),
      );
    }
  }

  function pickOperator(operator: string) {
    onChange(
      updateNode(root, ruleId, (node) =>
        node.type === "rule"
          ? { ...node, operator, value: defaultValue(operator) }
          : node,
      ),
    );
  }

  function setValue(value: unknown) {
    onChange(
      updateNode(root, ruleId, (node) =>
        node.type === "rule" ? { ...node, value } : node,
      ),
    );
  }

  return (
    <div className="group/row bg-muted/40 hover:bg-muted flex flex-wrap items-center gap-1.5 rounded-lg py-1.5 ps-2 pe-1.5 transition-colors">
      <Select value={rule.path.join(".")} onValueChange={pickField}>
        <SelectTrigger className="w-36 bg-transparent font-medium">
          <SelectValue placeholder={t("field")} />
        </SelectTrigger>
        <SelectContent>
          {fields.map((option) => (
            <SelectItem key={option.name} value={option.name}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={rule.operator} onValueChange={pickOperator}>
        <SelectTrigger className="text-muted-foreground w-36 bg-transparent">
          <SelectValue placeholder={t("operator")} />
        </SelectTrigger>
        <SelectContent>
          {operators.map((operator) => (
            <SelectItem key={operator} value={operator}>
              {t(`operators.${operator}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {field ? (
        <RuleValue
          field={field}
          operator={rule.operator}
          value={rule.value}
          onChange={setValue}
          t={t}
        />
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("removeFilter")}
        className="text-muted-foreground hover:text-foreground ms-auto size-8 opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100"
        onClick={() => onChange(removeNode(root, ruleId))}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

/** The arity + type aware value editor for a rule. */
function RuleValue({
  field,
  operator,
  value,
  onChange,
  t,
}: {
  field: FilterFieldDef;
  operator: string;
  value: unknown;
  onChange: (value: unknown) => void;
  t: Labels;
}) {
  const arity = operatorArity(operator);
  if (arity === "none") {
    return null;
  }

  if (field.type === "entity" && field.searchPath) {
    return (
      <EntityCombobox
        searchPath={field.searchPath}
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
        placeholder={t("search")}
        emptyLabel={t("noResults")}
      />
    );
  }

  const inputType =
    field.type === "number"
      ? "number"
      : field.type === "date"
        ? "date"
        : "text";

  if (arity === "many") {
    const options: FilterOption[] = field.options ?? [];
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <FilterMultiSelect
        label={t("value")}
        options={options}
        selected={selected}
        onChange={onChange}
        searchPlaceholder={t("search")}
        emptyLabel={t("noResults")}
      />
    );
  }

  if (arity === "range") {
    const [from, to] = Array.isArray(value) ? (value as string[]) : ["", ""];
    return (
      <div className="flex items-center gap-1">
        <Input
          type={inputType}
          value={from ?? ""}
          onChange={(event) => onChange([event.target.value, to ?? ""])}
          placeholder={t("from")}
          className="w-28"
        />
        <span className="text-muted-foreground text-xs">{t("and")}</span>
        <Input
          type={inputType}
          value={to ?? ""}
          onChange={(event) => onChange([from ?? "", event.target.value])}
          placeholder={t("to")}
          className="w-28"
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <Select
        value={typeof value === "string" ? value : ""}
        onValueChange={onChange}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder={t("value")} />
        </SelectTrigger>
        <SelectContent>
          {(field.options ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      type={inputType}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={t("value")}
      className="w-44"
    />
  );
}

function AddFieldMenu({
  fields,
  onPick,
  label,
}: {
  fields: FilterFieldDef[];
  onPick: (field: FilterFieldDef) => void;
  label: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1">
          <Plus className="size-3.5" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {fields.map((field) => (
          <DropdownMenuItem key={field.name} onSelect={() => onPick(field)}>
            {field.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
