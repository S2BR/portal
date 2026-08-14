"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * The directory's text search. Submitting navigates to `/businesses?q=…` (preserving any active
 * category filter and resetting the page), so results are server-rendered from the URL — shareable and
 * crawlable.
 */
export function DirectorySearch() {
  const t = useTranslations("businesses.directory");
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(params.toString());
    const trimmed = value.trim();
    if (trimmed) {
      next.set("q", trimmed);
    } else {
      next.delete("q");
    }
    next.delete("page");
    const query = next.toString();
    router.push(`/businesses${query ? `?${query}` : ""}`);
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className="border-input bg-background focus-within:ring-ring flex items-center gap-2 rounded-xl border px-3.5 py-2.5 focus-within:ring-2"
    >
      <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
      />
    </form>
  );
}
