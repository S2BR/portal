"use client";

import { ChevronLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AdForm } from "@/components/marketplace/ad-form";
import { AdTypePicker } from "@/components/marketplace/ad-type-picker";
import type { MarketplaceCategory } from "@/lib/marketplace/types";

/**
 * The post flow: pick an ad type (the bloom {@link AdTypePicker}), then the form for that type fades
 * in — on the same page, with a "change type" affordance back to the picker. The chosen category is
 * carried into the form so the created ad is filed under it.
 */
export function NewAdFlow({
  categories,
}: {
  categories: MarketplaceCategory[];
}) {
  const t = useTranslations("marketplace");
  const [selected, setSelected] = useState<MarketplaceCategory | null>(null);

  return (
    <AnimatePresence mode="wait">
      {selected === null ? (
        <motion.div
          key="picker"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <AdTypePicker categories={categories} onSelect={setSelected} />
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm font-medium"
          >
            <ChevronLeft className="size-4" />
            {t("new.changeType", { type: selected.name })}
          </button>
          <AdForm categorySlug={selected.slug} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
