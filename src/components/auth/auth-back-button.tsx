"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * Back control for the auth screens: returns to the previous page when there's history to go
 * back to, otherwise goes home (`/`). Ghost-styled to match the header controls; the arrow
 * flips in RTL.
 */
export function AuthBackButton() {
  const router = useRouter();
  const t = useTranslations("auth");

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("goBack")}
      onClick={goBack}
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
    </Button>
  );
}
