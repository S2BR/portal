import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { BusinessCard } from "@/components/business/public/business-card";
import { DirectoryMap } from "@/components/business/public/directory-map";
import { DirectorySearch } from "@/components/business/public/directory-search";
import { cn } from "@/lib/utils";
import {
  getPublicCategories,
  getPublicDirectory,
} from "@/lib/public-business";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businesses.directory");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: "/businesses" },
  };
}

type SearchParams = { q?: string; category?: string; page?: string };

/** Build a `/businesses` href, keeping the current filters and patching the given keys. */
function hrefFor(current: SearchParams, patch: Partial<SearchParams>): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  if (merged.q) {
    params.set("q", merged.q);
  }
  if (merged.category) {
    params.set("category", merged.category);
  }
  if (merged.page && merged.page !== "1") {
    params.set("page", merged.page);
  }
  const query = params.toString();
  return `/businesses${query ? `?${query}` : ""}`;
}

/** The public business directory — browse + search + filter + map, server-rendered from the URL. */
export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const t = await getTranslations("businesses.directory");
  const page = Number(sp.page) || 1;

  const [directory, categories] = await Promise.all([
    getPublicDirectory({ q: sp.q, category: sp.category, page }),
    getPublicCategories(),
  ]);

  const { current_page, last_page, total } = directory.meta;
  const hasLocated = directory.data.some(
    (business) => business.latitude !== null && business.longitude !== null,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        <div className="mt-4 max-w-xl">
          <DirectorySearch />
        </div>
      </header>

      <div
        className={cn(
          "grid gap-6",
          hasLocated && "lg:grid-cols-[1fr_360px]",
        )}
      >
        <div>
          {/* Category filter */}
          <div className="mb-5 flex flex-wrap gap-2">
            <Link
              href={hrefFor(sp, { category: undefined, page: undefined })}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                !sp.category
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "hover:bg-accent",
              )}
            >
              {t("all")}
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={hrefFor(sp, { category: category.slug, page: undefined })}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  sp.category === category.slug
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "hover:bg-accent",
                )}
              >
                {category.name}
              </Link>
            ))}
          </div>

          <p className="text-muted-foreground mb-4 text-sm">
            {t("count", { count: total })}
          </p>

          {directory.data.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {directory.data.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed py-16 text-center">
              <p className="font-medium">{t("emptyTitle")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("emptyBody")}
              </p>
            </div>
          )}

          {/* Pagination */}
          {last_page > 1 ? (
            <nav
              className="mt-8 flex items-center justify-between gap-4"
              aria-label={t("pagination")}
            >
              {current_page > 1 ? (
                <Link
                  href={hrefFor(sp, { page: String(current_page - 1) })}
                  className="hover:bg-accent rounded-lg border px-4 py-2 text-sm font-medium"
                  rel="prev"
                >
                  {t("previous")}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground text-sm">
                {t("pageOf", { current: current_page, total: last_page })}
              </span>
              {current_page < last_page ? (
                <Link
                  href={hrefFor(sp, { page: String(current_page + 1) })}
                  className="hover:bg-accent rounded-lg border px-4 py-2 text-sm font-medium"
                  rel="next"
                >
                  {t("next")}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </div>

        {/* Map — beside the results on large screens (hidden on smaller). */}
        {hasLocated ? (
          <aside className="hidden lg:block" aria-label={t("mapLabel")}>
            <div className="sticky top-4">
              <DirectoryMap
                businesses={directory.data}
                className="h-[calc(100svh-8rem)]"
              />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
