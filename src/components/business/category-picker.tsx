"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { Category } from "@/app/api/categories/route";
import { cn } from "@/lib/utils";

/**
 * Category → subcategory cascade. Roots are chips; selecting one slides open a muted panel with its
 * subcategories. Selection uses the app's language — a muted fill plus a brand-green dot — and the
 * reveal/reflow is animated (respecting reduced-motion). The value is a flat list of selected
 * category ids (roots and subcategories together, matching the API's single categorizables pivot).
 * Deselecting a root also drops its subcategories.
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
  const reduceMotion = useReducedMotion();
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

  const openRoots = tree.filter(
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

      <AnimatePresence initial={false}>
        {openRoots.map((root) => {
          const subs = root.subcategories ?? [];
          const count = subs.filter((sub) => selected.has(sub.id)).length;
          return (
            <motion.div
              key={root.id}
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="bg-muted/40 rounded-xl p-3.5">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{root.name}</span>
                  {count > 0 ? (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {t("categoriesSelectedCount", { count })}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {subs.map((sub) => (
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
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * The read-only view of a business's categories: the flat selected list, grouped back into its
 * root → subcategory shape. Each root is a heading with a soft brand-green accent; its selected
 * subcategories sit beneath as soft filled chips — a calmer, more structured look than a flat row
 * of outline pills.
 */
export function CategoryReadout({ categories }: { categories: Category[] }) {
  const subsByRoot = new Map<number, Category[]>();
  for (const category of categories) {
    if (category.parent_id !== null) {
      const group = subsByRoot.get(category.parent_id) ?? [];
      group.push(category);
      subsByRoot.set(category.parent_id, group);
    }
  }
  const roots = categories.filter((category) => category.parent_id === null);

  return (
    <div className="space-y-4">
      {roots.map((root) => {
        const subs = subsByRoot.get(root.id) ?? [];
        return (
          <div key={root.id}>
            <div className="flex items-center gap-2">
              <span
                className="bg-brand-green h-3.5 w-1 rounded-full"
                aria-hidden
              />
              <span className="text-sm font-medium">{root.name}</span>
            </div>
            {subs.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5 ps-3">
                {subs.map((sub) => (
                  <span
                    key={sub.id}
                    className="bg-muted/60 text-foreground/80 rounded-full px-2.5 py-1 text-xs"
                  >
                    {sub.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * A pill toggle in the app's selection language: a three-step muted fill (default → hover →
 * selected) with a brand-green dot marking the selection, instead of a colored border.
 */
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
    <motion.button
      type="button"
      layout
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full transition-colors outline-none focus-visible:ring-2",
        small ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
        active
          ? "bg-muted-foreground/10 text-foreground font-medium"
          : "bg-muted/40 text-muted-foreground hover:bg-muted/70",
      )}
    >
      {children}
      <AnimatePresence initial={false}>
        {active ? (
          <motion.span
            key="dot"
            layout
            initial={{ scale: 0, width: 0 }}
            animate={{ scale: 1, width: "0.375rem" }}
            exit={{ scale: 0, width: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="bg-brand-green h-1.5 shrink-0 rounded-full"
            aria-hidden
          />
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
}
