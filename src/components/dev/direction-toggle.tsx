"use client";

import { ArrowLeftRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * Dev/QA only: flip the layout between LTR and RTL by toggling a cookie the root layout reads.
 * Returns null in production (the check is compiled away), so it never ships to users. Lets you
 * eyeball right-to-left layout without adding an RTL locale yet.
 */
export function DirectionToggle() {
  const router = useRouter();

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  function toggle() {
    const current = document.cookie.match(/(?:^|;\s*)DEV_DIR=([^;]*)/)?.[1];
    const next = current === "rtl" ? "ltr" : "rtl";
    document.cookie = `DEV_DIR=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label="Toggle text direction (dev)"
      title="Toggle LTR/RTL (dev only)"
    >
      <ArrowLeftRight className="size-4" />
    </Button>
  );
}
