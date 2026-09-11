"use client";

import { Tag } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Category } from "@/app/api/categories/route";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** How many top-level categories to name inline before collapsing the rest into "+N more". */
const INLINE_LIMIT = 3;

/**
 * The business's categories on its profile header — a quiet one-line summary: the first few top-level
 * (root) categories, then a "+N more" that opens a popover listing every category grouped by root →
 * subcategory. This keeps the header to a single unobtrusive line no matter how deep the selection is,
 * instead of a wall of chips that wraps and crowds the actions on small screens.
 */
export function ProfileCategories({ categories }: { categories: Category[] }) {
  const t = useTranslations("businesses.public");

  const byId = new Map(categories.map((category) => [category.id, category]));
  const roots = categories.filter((category) => category.parent_id === null);

  // Subcategories grouped under the parent that's also present; a sub whose parent wasn't selected
  // stands on its own so nothing is dropped.
  const subsByParent = new Map<number, Category[]>();
  const orphanSubs: Category[] = [];
  for (const category of categories) {
    if (category.parent_id === null) {
      continue;
    }
    if (byId.has(category.parent_id)) {
      const list = subsByParent.get(category.parent_id) ?? [];
      list.push(category);
      subsByParent.set(category.parent_id, list);
    } else {
      orphanSubs.push(category);
    }
  }

  // Top-level items shown inline: the roots, plus any orphan subs so nothing is lost.
  const topLevel = [...roots, ...orphanSubs];
  if (topLevel.length === 0) {
    return null;
  }

  const inline = topLevel.slice(0, INLINE_LIMIT);
  const hiddenTopLevel = topLevel.length - inline.length;
  // Show the trigger when there's anything the inline line doesn't already say — more top-level items,
  // or subcategories tucked under a shown root.
  const hasMore = hiddenTopLevel > 0 || subsByParent.size > 0;

  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
      <Tag className="size-3.5 shrink-0" aria-hidden />
      <p>
        {inline.map((category, index) => (
          <span key={category.id}>
            {index > 0 ? " · " : null}
            <span className="text-foreground font-semibold">
              {category.name}
            </span>
          </span>
        ))}
        {hasMore ? (
          <>
            {" · "}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring cursor-pointer rounded font-medium underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  {hiddenTopLevel > 0
                    ? t("moreCount", { count: hiddenTopLevel })
                    : t("allCategories")}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="max-h-[min(60vh,22rem)] w-72 overflow-y-auto p-4"
              >
                <ul className="space-y-3">
                  {roots.map((root) => {
                    const subs = subsByParent.get(root.id) ?? [];
                    return (
                      <li key={root.id} className="space-y-0.5">
                        <p className="text-foreground text-sm font-medium">
                          {root.name}
                        </p>
                        {subs.length > 0 ? (
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            {subs.map((sub) => sub.name).join(" · ")}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                  {orphanSubs.length > 0 ? (
                    <li className="text-foreground text-sm font-medium">
                      {orphanSubs.map((sub) => sub.name).join(" · ")}
                    </li>
                  ) : null}
                </ul>
              </PopoverContent>
            </Popover>
          </>
        ) : null}
      </p>
    </div>
  );
}
