"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRefinementList } from "react-instantsearch";

import type { CategoryNode } from "@/components/business/public/category-tree-nodes";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * The directory's category filter as a cascading checkbox TREE. Structure + localized labels come
 * from the taxonomy API (`tree`, keyed by category id); counts and refinement come from the
 * `category_ids` Typesense facet. Because a business indexes its categories' ancestor ids too,
 * checking a root filters everything beneath it. Ids (not names) drive the filter, so a category
 * rename never touches the search index — only this `tree` changes.
 */

export function CategoryTree({
  title,
  tree,
}: {
  title: string;
  tree: CategoryNode[];
}) {
  const t = useTranslations("businesses.directory");
  const { items, refine } = useRefinementList({
    attribute: "category_ids",
    limit: 500,
  });
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  // Facet state keyed by category id (as a string, the facet value).
  const state = new Map(
    items.map((item) => [
      item.value,
      { count: item.count, isRefined: item.isRefined },
    ]),
  );

  const has = (id: number) => state.has(String(id));
  const visibleRoots = tree.filter(
    (root) => has(root.id) || root.children.some((child) => has(child.id)),
  );

  if (visibleRoots.length === 0) {
    return null;
  }

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  return (
    <div>
      <h3 className="text-muted-foreground px-2 text-xs font-medium tracking-wider uppercase">
        {title}
      </h3>
      <ul className="mt-2 space-y-0.5">
        {visibleRoots.map((root) => {
          const rootState = state.get(String(root.id));
          const children = root.children.filter((child) => has(child.id));
          const hasChildren = children.length > 0;
          const isOpen =
            expanded.has(root.id) ||
            !!rootState?.isRefined ||
            children.some((child) => state.get(String(child.id))?.isRefined);

          return (
            <li key={root.id}>
              <div className="hover:bg-muted/60 flex items-center gap-1 rounded-md pr-2">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggle(root.id)}
                    aria-label={isOpen ? t("collapse") : t("expand")}
                    aria-expanded={isOpen}
                    className="text-muted-foreground hover:text-foreground shrink-0 p-1"
                  >
                    <ChevronRight
                      className={cn(
                        "size-3.5 transition-transform",
                        isOpen && "rotate-90",
                      )}
                      aria-hidden
                    />
                  </button>
                ) : (
                  <span className="w-[1.375rem] shrink-0" aria-hidden />
                )}
                <label className="flex flex-1 cursor-pointer items-center gap-2.5 py-1.5 text-sm">
                  <Checkbox
                    checked={!!rootState?.isRefined}
                    onCheckedChange={() => refine(String(root.id))}
                  />
                  <span className="min-w-0 flex-1 truncate">{root.label}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {rootState?.count ?? 0}
                  </span>
                </label>
              </div>
              {hasChildren && isOpen ? (
                <ul className="space-y-0.5">
                  {children.map((child) => {
                    const childState = state.get(String(child.id));
                    return (
                      <li key={child.id}>
                        <label className="hover:bg-muted/60 flex cursor-pointer items-center gap-2.5 rounded-md py-1.5 pr-2 pl-9 text-sm">
                          <Checkbox
                            checked={!!childState?.isRefined}
                            onCheckedChange={() => refine(String(child.id))}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {child.label}
                          </span>
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {childState?.count ?? 0}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
