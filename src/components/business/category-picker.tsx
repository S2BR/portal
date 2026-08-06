"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { Category } from "@/app/api/categories/route";
import { cn } from "@/lib/utils";

/**
 * Category → subcategory cascade. Roots are chips; selecting one reveals its subcategories. The
 * value is a flat list of selected category ids (roots and subcategories together, matching the
 * API's single categorizables pivot). Deselecting a root also drops its subcategories.
 */
export function CategoryPicker({
  tree,
  value,
  onChange,
}: {
  tree: Category[];
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const t = useTranslations("businesses.detail");
  const selected = new Set(value);

  function toggleRoot(root: Category) {
    const next = new Set(selected);
    if (next.has(root.id)) {
      next.delete(root.id);
      for (const sub of root.subcategories ?? []) {
        next.delete(sub.id);
      }
    } else {
      next.add(root.id);
    }
    onChange([...next]);
  }

  function toggleSub(id: number) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange([...next]);
  }

  if (tree.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{t("categoriesEmpty")}</p>
    );
  }

  const expanded = tree.filter(
    (root) => selected.has(root.id) && (root.subcategories ?? []).length > 0,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tree.map((root) => (
          <Chip
            key={root.id}
            active={selected.has(root.id)}
            onClick={() => toggleRoot(root)}
          >
            {root.name}
          </Chip>
        ))}
      </div>

      {expanded.map((root) => (
        <div key={root.id} className="border-s ps-3">
          <p className="text-muted-foreground mb-1.5 text-xs font-medium">
            {root.name}
          </p>
          <div className="flex flex-wrap gap-2">
            {(root.subcategories ?? []).map((sub) => (
              <Chip
                key={sub.id}
                active={selected.has(sub.id)}
                onClick={() => toggleSub(sub.id)}
                small
              >
                {sub.name}
              </Chip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  small,
  children,
}: {
  active: boolean;
  onClick: () => void;
  small?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-visible:ring-ring rounded-full border px-3 py-1 text-sm transition-colors outline-none focus-visible:ring-2",
        small && "px-2.5 py-0.5 text-xs",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}
