"use client";

import {
  Car,
  House,
  Laptop,
  Package,
  Plus,
  Sofa,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { BlurScrim } from "@/components/ui/blur-scrim";
import type { MarketplaceCategory } from "@/lib/marketplace/types";
import { cn } from "@/lib/utils";

/** Maps a category's stored `icon` identifier to its glyph; unknown names fall back to a tag. */
const ICONS: Record<string, LucideIcon> = {
  house: House,
  car: Car,
  sofa: Sofa,
  laptop: Laptop,
  package: Package,
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The post flow's first step: a single trigger that blooms open into the ad types, iris-out from the
 * centre with a radially-staggered reveal. Picking a type hands it back to the parent, which swaps in
 * the form. Honors reduced-motion (no bloom, just a fade). Types are data-driven (marketplace
 * categories), so new ones appear here with no code change.
 */
export function AdTypePicker({
  categories,
  onSelect,
}: {
  categories: MarketplaceCategory[];
  onSelect: (category: MarketplaceCategory) => void;
}) {
  const t = useTranslations("marketplace");
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  if (categories.length === 0) {
    return (
      <p className="text-muted-foreground py-16 text-center text-sm">
        {t("new.typesEmpty")}
      </p>
    );
  }

  const mid = (categories.length - 1) / 2;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-8 py-8",
        // Lift the trigger + tiles above the blur scrim (z-[9]) so they stay crisp while the page blurs.
        open && "z-10",
      )}
    >
      {/* Soft page blur behind the open menu — same scrim the header language/theme menus use. */}
      <BlurScrim open={open} onClose={() => setOpen(false)} />

      <motion.button
        type="button"
        layout
        onClick={() => setOpen((value) => !value)}
        whileTap={{ scale: 0.97 }}
        aria-expanded={open}
        className={cn(
          "focus-visible:ring-ring inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2",
          open
            ? "bg-muted/60 text-muted-foreground hover:bg-muted"
            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        )}
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.24, ease: EASE }}
          className="inline-flex"
        >
          <Plus className="size-4" />
        </motion.span>
        {open ? t("new.pickPrompt") : t("new.chooseType")}
      </motion.button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.ul
            layout
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.26, ease: EASE }}
            className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 overflow-hidden sm:grid-cols-3 lg:grid-cols-5"
          >
            {categories.map((category, index) => {
              const Icon = (category.icon && ICONS[category.icon]) || Tag;
              return (
                <motion.li
                  key={category.slug}
                  initial={
                    reduceMotion ? false : { opacity: 0, scale: 0.6, y: 10 }
                  }
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    // Radial stagger: tiles nearer the centre bloom first.
                    delay: reduceMotion ? 0 : Math.abs(index - mid) * 0.06,
                    ease: EASE,
                  }}
                >
                  <motion.button
                    type="button"
                    onClick={() => onSelect(category)}
                    whileTap={{ scale: 0.97 }}
                    // Borderless three-step gray, matching the business-type cards in the businesses
                    // CRUD: very light by default, a touch grayer on hover.
                    className="focus-visible:ring-ring bg-muted/40 hover:bg-muted/70 flex aspect-square w-full flex-col items-center justify-center gap-2.5 rounded-xl p-3 text-center transition-colors outline-none focus-visible:ring-2"
                  >
                    <span className="bg-background text-muted-foreground flex size-11 items-center justify-center rounded-lg">
                      <Icon className="size-6" />
                    </span>
                    <span className="text-sm font-medium">{category.name}</span>
                  </motion.button>
                </motion.li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
