"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { useBusinessNav } from "@/components/business/business-nav-context";

/**
 * The hamburger next to the logo that opens the business sidebar as a drawer on small screens. Shows
 * only while a business sidebar is mounted (a business page) and only on mobile — on wider screens the
 * sidebar is always visible, so there's nothing to toggle.
 */
export function BusinessNavToggle() {
  const nav = useBusinessNav();
  const t = useTranslations("businesses.workspace");

  if (!nav?.present) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => nav.setOpen(true)}
      aria-label={t("openMenu")}
      className="hover:bg-muted/60 focus-visible:ring-ring -ms-1 flex size-9 items-center justify-center rounded-lg outline-none focus-visible:ring-2 sm:hidden"
    >
      <Menu className="size-5" aria-hidden />
    </button>
  );
}
