"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { displayName, type TaxonomyNode } from "@/lib/taxonomy/admin";

import type { NodeKind } from "./node-dialog";

/**
 * Confirm removing a node. Two escape hatches, never a hard block: DEACTIVATE (clears the live flag,
 * fully reversible) or DELETE (soft-delete; a root cascades to its children). The usage + children
 * counts are surfaced so the operator sees the blast radius first.
 */
export function DeleteNodeDialog({
  kind,
  open,
  onOpenChange,
  node,
  onDone,
}: {
  kind: NodeKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: TaxonomyNode;
  onDone: () => void;
}) {
  const t = useTranslations("admin.taxonomy");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);

  const path = kind === "category" ? "categories" : "amenities";
  const childCount = node.children?.length ?? 0;

  async function act(kindOfAction: "deactivate" | "delete") {
    setBusy(true);
    const response =
      kindOfAction === "deactivate"
        ? await fetch(`/api/admin/taxonomy/${path}/${node.id}/activation`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: false }),
          })
        : await fetch(`/api/admin/taxonomy/${path}/${node.id}`, {
            method: "DELETE",
          });
    setBusy(false);

    if (!response.ok) {
      toast.error(t(response.status === 403 ? "forbidden" : "saveError"));
      return;
    }
    toast.success(
      t(kindOfAction === "deactivate" ? "toast.deactivated" : "toast.deleted"),
    );
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("delete.title", { name: displayName(node.name, locale) })}
          </DialogTitle>
          <DialogDescription>
            {t("delete.usage", { count: node.usage_count })}
            {childCount > 0
              ? ` ${t("delete.children", { count: childCount })}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">{t("delete.help")}</p>

        <DialogFooter className="gap-2 sm:flex-col sm:items-stretch">
          {node.is_active ? (
            <Button
              variant="outline"
              onClick={() => act("deactivate")}
              disabled={busy}
            >
              {t("delete.deactivate")}
            </Button>
          ) : null}
          <Button
            variant="destructive"
            onClick={() => act("delete")}
            disabled={busy}
          >
            {t("delete.delete")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {t("dialog.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
