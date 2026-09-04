"use client";

import { Check, FolderPlus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { NodeDialog } from "@/components/admin/taxonomy/node-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { AdminCategorySuggestion } from "@/app/api/admin/category-suggestions/route";

type Status = "pending" | "actioned" | "dismissed";

const STATUSES: Status[] = ["pending", "actioned", "dismissed"];

/**
 * The operator review queue for business category suggestions. Filter by status; per pending row,
 * turn it into a category (opens the create dialog prefilled — marking the suggestion actioned on
 * save) or dismiss it. The API enforces super_admin (a 403 surfaces here).
 */
export function CategorySuggestionsQueue() {
  const t = useTranslations("admin.taxonomy.suggestions");
  const locale = useLocale();

  const [status, setStatus] = useState<Status>("pending");
  const [items, setItems] = useState<AdminCategorySuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<AdminCategorySuggestion | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/category-suggestions?status=${status}`,
      );
      if (response.status === 403) {
        toast.error(t("forbidden"));
        return;
      }
      const data = (await response.json()) as {
        data: AdminCategorySuggestion[];
      };
      setItems(data.data ?? []);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [status, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const review = useCallback(
    async (id: number, next: Status): Promise<boolean> => {
      const response = await fetch(`/api/admin/category-suggestions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        toast.error(t("actionError"));
        return false;
      }
      return true;
    },
    [t],
  );

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  });

  return (
    <div className="space-y-5">
      {/* Status filter — on the shared Tabs primitive. */}
      <Tabs
        value={status}
        onValueChange={(value) => setStatus(value as Status)}
      >
        <TabsList className="w-fit">
          {STATUSES.map((value) => (
            <TabsTrigger key={value} value={value}>
              {t(`filter.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
          {t(`empty.${status}`)}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((suggestion) => (
            <li
              key={suggestion.id}
              className="bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium break-words">
                  {`“${suggestion.text}”`}
                </p>
                <p className="text-muted-foreground text-sm">
                  {t.rich("from", {
                    business: () => (
                      <Link
                        href={`/portal/admin/businesses/${suggestion.business.id}`}
                        className="text-foreground underline underline-offset-2 hover:no-underline"
                      >
                        {suggestion.business.name}
                      </Link>
                    ),
                  })}
                  {suggestion.created_at
                    ? ` · ${dateFormatter.format(new Date(suggestion.created_at))}`
                    : null}
                </p>
              </div>

              {status === "pending" ? (
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    onClick={() => setCreating(suggestion)}
                    className="gap-1.5"
                  >
                    <FolderPlus className="size-4" aria-hidden />
                    {t("createCategory")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (await review(suggestion.id, "dismissed")) {
                        void load();
                      }
                    }}
                    className="gap-1.5"
                  >
                    <X className="size-4" aria-hidden />
                    {t("dismiss")}
                  </Button>
                </div>
              ) : (
                <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1.5 text-sm">
                  <Check className="size-4" aria-hidden />
                  {t(`status.${suggestion.status}`)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {creating ? (
        <NodeDialog
          kind="category"
          open
          onOpenChange={(open) => (open ? null : setCreating(null))}
          node={null}
          parentId={null}
          categories={[]}
          initialName={creating.text}
          onSaved={async () => {
            // The category was created; mark the suggestion handled and refresh.
            await review(creating.id, "actioned");
            setCreating(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
