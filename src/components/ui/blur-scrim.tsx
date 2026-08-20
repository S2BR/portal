"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";

/**
 * The soft blur scrim shown behind an open header popover (language / theme). Matches the category
 * "Can't find your category?" feedback popover's scrim exactly — a framer fade IN and OUT via
 * AnimatePresence (a plain CSS `animate-in` can't animate the exit). Portaled to <body> so `fixed`
 * covers the viewport, at z-[9] — just under the header's z-10 — so the page blurs while the header
 * stays crisp. Closes the popover on pointer-down.
 */
export function BlurScrim({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="scrim"
          aria-hidden
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onPointerDown={onClose}
          className="fixed inset-0 z-[9] bg-black/10 backdrop-blur-[3px]"
        />
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
