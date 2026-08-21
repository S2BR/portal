"use client";

import { useState } from "react";

import { FilterBuilder } from "@/components/admin/filter-builder";
import { toApiParams, type FilterQuery } from "@/lib/filters/to-api-params";
import { emptyQuery, type FilterFieldDef } from "@/lib/filters/tree";

interface ExampleDef {
  title: string;
  description: string;
  fields: FilterFieldDef[];
}

const COUNTRIES = [
  "Brazil",
  "Portugal",
  "United States",
  "Canada",
  "France",
  "Germany",
  "Italy",
  "Japan",
  "Spain",
  "Argentina",
  "Mexico",
  "United Kingdom",
];

/**
 * Reference examples covering every field-config shape — select (single + multi-select via
 * is_any_of), text (contains/starts_with), number (comparisons + between), date (before/after +
 * between), boolean (a yes/no select), and large searchable option lists. Every example also supports
 * AND/OR + nested groups (that's the builder, not the field config).
 */
const EXAMPLES: ExampleDef[] = [
  {
    title: "Users — select + text + boolean",
    description:
      "A role select, an email text field (contains / starts with …), and an active yes/no flag.",
    fields: [
      {
        name: "role",
        label: "Role",
        type: "select",
        options: [
          { value: "admin", label: "Admin" },
          { value: "editor", label: "Editor" },
          { value: "viewer", label: "Viewer" },
        ],
      },
      { name: "email", label: "Email", type: "text" },
      {
        name: "active",
        label: "Active",
        type: "select",
        options: [
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ],
      },
    ],
  },
  {
    title: "Products — multi-select + number range",
    description:
      "Categories as a multi-select (is any of / none of), price + stock as numbers (=, >, between …).",
    fields: [
      {
        name: "category",
        label: "Category",
        type: "select",
        options: [
          { value: "food", label: "Food" },
          { value: "drink", label: "Drink" },
          { value: "service", label: "Service" },
          { value: "retail", label: "Retail" },
          { value: "other", label: "Other" },
        ],
      },
      { name: "price", label: "Price", type: "number" },
      { name: "stock", label: "Stock", type: "number" },
    ],
  },
  {
    title: "Events — date range",
    description:
      "A start date (before / after / between) plus a kind select and a title text field.",
    fields: [
      { name: "starts_at", label: "Starts at", type: "date" },
      {
        name: "kind",
        label: "Kind",
        type: "select",
        options: [
          { value: "meetup", label: "Meetup" },
          { value: "market", label: "Market" },
          { value: "party", label: "Party" },
        ],
      },
      { name: "title", label: "Title", type: "text" },
    ],
  },
  {
    title: "Large options — searchable select",
    description:
      "A country select with many options (the multi-select popover searches) + a city text field.",
    fields: [
      {
        name: "country",
        label: "Country",
        type: "select",
        options: COUNTRIES.map((country) => ({
          value: country.toLowerCase().replace(/\s+/g, "-"),
          label: country,
        })),
      },
      { name: "city", label: "City", type: "text" },
    ],
  },
];

function Example({ example }: { example: ExampleDef }) {
  const [query, setQuery] = useState<FilterQuery>(emptyQuery);
  const params = toApiParams(query).toString();

  return (
    <section className="space-y-4 rounded-xl border p-5">
      <div>
        <h2 className="font-medium">{example.title}</h2>
        <p className="text-muted-foreground text-sm">{example.description}</p>
      </div>

      <FilterBuilder value={query} onChange={setQuery} fields={example.fields} />

      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Compiled API params
        </p>
        <code className="bg-muted text-muted-foreground block rounded-md p-2.5 text-xs break-all">
          {params ? decodeURIComponent(params) : "(no filters)"}
        </code>
      </div>
    </section>
  );
}

/**
 * A gated, not-in-nav living reference for the operator filter builder — a set of example field
 * configs, each showing the query it compiles to. Super-admin only (the admin layout gates it).
 */
export function FiltersShowcase() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Filter builder — examples
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every field-config shape on the shared operator builder. Build a query and watch it compile
          to the API filter params (readable when it&apos;s a simple AND, a base64url tree for OR /
          nested groups).
        </p>
      </header>

      {EXAMPLES.map((example) => (
        <Example key={example.title} example={example} />
      ))}
    </div>
  );
}
