/**
 * The post-form layout model, shared by the renderer (AdForm) and the admin builder. Mirrors the API's
 * Enums\CoreField / Enums\FieldWidth and the category `layout` payload. Pure + client-safe.
 */

export type FieldWidth = "full" | "two_thirds" | "half" | "third";

export const FIELD_WIDTHS: FieldWidth[] = ["full", "two_thirds", "half", "third"];

/** The built-in (non-dynamic) fields the builder can place, matching the API's CoreField enum. */
export type CoreFieldKey =
  | "title"
  | "description"
  | "price"
  | "condition"
  | "location"
  | "contact"
  | "images";

export const CORE_FIELDS: CoreFieldKey[] = [
  "title",
  "description",
  "price",
  "condition",
  "location",
  "contact",
  "images",
];

/**
 * Core fields the renderer always shows even when a custom layout omits them — the required inputs plus
 * the photo widget (so an owner can always add photos). Optional core fields (condition, location) show
 * only where placed.
 */
export const AUTO_APPEND_CORE: CoreFieldKey[] = [
  "title",
  "description",
  "price",
  "contact",
  "images",
];

export interface LayoutItem {
  kind: "core" | "attribute";
  key: string;
  width: FieldWidth;
}

/** A section as the public schema returns it — `name` already resolved to the request locale. */
export interface PublicLayoutSection {
  id: string;
  name: string | null;
  items: LayoutItem[];
}

export interface PublicFormLayout {
  sections: PublicLayoutSection[];
}

/** Column span per width on the form's 6-column grid (collapses to 1 column on phones via CSS). */
export const WIDTH_COLS: Record<FieldWidth, number> = {
  full: 6,
  two_thirds: 4,
  half: 3,
  third: 2,
};

export interface RenderSection {
  id: string;
  name: string | null;
  items: LayoutItem[];
}

const isCoreKey = (key: string): key is CoreFieldKey =>
  (CORE_FIELDS as string[]).includes(key);

/** The built-in default arrangement when a category has no custom layout. */
function defaultPlan(attributeKeys: string[]): RenderSection[] {
  const items: LayoutItem[] = [
    { kind: "core", key: "title", width: "full" },
    { kind: "core", key: "description", width: "full" },
    ...attributeKeys.map(
      (key): LayoutItem => ({ kind: "attribute", key, width: "full" }),
    ),
    { kind: "core", key: "price", width: "half" },
    { kind: "core", key: "condition", width: "half" },
    { kind: "core", key: "location", width: "half" },
    { kind: "core", key: "contact", width: "half" },
    { kind: "core", key: "images", width: "full" },
  ];
  return [{ id: "__default__", name: null, items }];
}

/**
 * Resolve the layout to render: a custom layout's sections (keeping only valid, known field refs), or
 * the built-in default. Any required/auto-append core field and any dynamic field the layout didn't
 * place is appended to a trailing section, so a layout can never hide a required input or drop a newly
 * added dynamic field.
 */
export function buildRenderPlan(
  layout: PublicFormLayout | null | undefined,
  attributeKeys: string[],
): RenderSection[] {
  const attrSet = new Set(attributeKeys);

  if (!layout || layout.sections.length === 0) {
    return defaultPlan(attributeKeys);
  }

  const placed = new Set<string>();
  const sections: RenderSection[] = layout.sections.map((section) => {
    const items = section.items.filter((item) => {
      const valid =
        item.kind === "core" ? isCoreKey(item.key) : attrSet.has(item.key);
      if (!valid) {
        return false;
      }
      const token = `${item.kind}:${item.key}`;
      if (placed.has(token)) {
        return false;
      }
      placed.add(token);
      return true;
    });
    return { id: section.id, name: section.name, items };
  });

  const trailing: LayoutItem[] = [
    ...AUTO_APPEND_CORE.filter((key) => !placed.has(`core:${key}`)).map(
      (key): LayoutItem => ({ kind: "core", key, width: "full" }),
    ),
    ...attributeKeys
      .filter((key) => !placed.has(`attribute:${key}`))
      .map((key): LayoutItem => ({ kind: "attribute", key, width: "full" })),
  ];

  if (trailing.length > 0) {
    sections.push({ id: "__more__", name: null, items: trailing });
  }

  return sections.filter((section) => section.items.length > 0);
}
