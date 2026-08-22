"use client";

import { FolderTree, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminAmenity, AdminCategory } from "@/lib/taxonomy/admin";

import { TaxonomyTree } from "./taxonomy-tree";

/**
 * The operator taxonomy manager: two tabs (Categories, Amenities), each a drag-orderable two-level
 * tree with inline create/edit/activate/delete. Categories load alongside amenities because they're
 * also the binding options for the amenity category-scope picker. The API enforces the super_admin
 * role (a 403 surfaces here).
 */
export function TaxonomyManager() {
  const t = useTranslations("admin.taxonomy");

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [amenities, setAmenities] = useState<AdminAmenity[]>([]);
  const [loading, setLoading] = useState(true);
  // Bumped on every load so each tree remounts with the server's truth (see TaxonomyTree).
  const [revision, setRevision] = useState(0);

  const load = useCallback(async () => {
    try {
      const [categoriesResponse, amenitiesResponse] = await Promise.all([
        fetch("/api/admin/taxonomy/categories"),
        fetch("/api/admin/taxonomy/amenities"),
      ]);
      if (
        categoriesResponse.status === 403 ||
        amenitiesResponse.status === 403
      ) {
        toast.error(t("forbidden"));
        return;
      }
      const categoriesData = (await categoriesResponse.json()) as {
        categories: AdminCategory[];
      };
      const amenitiesData = (await amenitiesResponse.json()) as {
        amenities: AdminAmenity[];
      };
      setCategories(categoriesData.categories);
      setAmenities(amenitiesData.amenities);
      setRevision((current) => current + 1);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="categories">
          {/* Centered pill tabs — the same pattern as the business-detail section tabs. */}
          <TabsList className="mx-auto h-auto w-fit max-w-full p-1.5">
            <TabsTrigger value="categories" className="px-4 py-2">
              <FolderTree className="size-4" aria-hidden />
              {t("tabs.categories")}
            </TabsTrigger>
            <TabsTrigger value="amenities" className="px-4 py-2">
              <Sparkles className="size-4" aria-hidden />
              {t("tabs.amenities")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="categories" className="mt-6">
            <TaxonomyTree
              key={`category-${revision}`}
              kind="category"
              nodes={categories}
              categories={categories}
              onChanged={load}
            />
          </TabsContent>
          <TabsContent value="amenities" className="mt-6">
            <TaxonomyTree
              key={`amenity-${revision}`}
              kind="amenity"
              nodes={amenities}
              categories={categories}
              onChanged={load}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
