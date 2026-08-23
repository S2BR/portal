"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DragHandle,
  overlayClass,
  placeholderClass,
} from "@/components/ui/drag-handle";
import { SortableList } from "@/components/ui/sortable-list";
import { Switch } from "@/components/ui/switch";
import {
  type AdminCategory,
  displayName,
  type TaxonomyNode,
} from "@/lib/taxonomy/admin";
import { cn } from "@/lib/utils";

import { DeleteNodeDialog } from "./delete-node-dialog";
import { LocaleAvatars } from "./locale-avatars";
import { NodeDialog, type NodeKind } from "./node-dialog";

type DialogState =
  | { mode: "create"; parentId: number | null }
  | { mode: "edit"; node: TaxonomyNode }
  | null;

/**
 * The two-level taxonomy tree editor. Roots and, within each root, its children are drag-reorderable
 * (dnd-kit); every node has an inline live toggle and edit/delete. Reorders persist optimistically;
 * every other change reloads from the server. Shared by the Categories and Amenities tabs — the
 * amenity variant additionally shows each node's category-binding count.
 */
export function TaxonomyTree({
  kind,
  nodes,
  categories,
  onChanged,
}: {
  kind: NodeKind;
  nodes: TaxonomyNode[];
  categories: AdminCategory[];
  onChanged: () => void;
}) {
  const t = useTranslations("admin.taxonomy");
  const locale = useLocale();

  // Seeded from props; the manager remounts this tree (via `key`) after a server reload, so local
  // order edits during a drag persist without a prop-sync effect.
  const [roots, setRoots] = useState<TaxonomyNode[]>(nodes);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [pendingDelete, setPendingDelete] = useState<TaxonomyNode | null>(null);
  // True while a root is being dragged — every block collapses to its header so the big blocks stay
  // compact and easy to reorder (same idea as the business addresses editor).
  const [dragging, setDragging] = useState(false);

  const path = kind === "category" ? "categories" : "amenities";

  async function persistOrder(ids: number[]) {
    const response = await fetch(`/api/admin/taxonomy/${path}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) {
      toast.error(t("saveError"));
      onChanged(); // resync to the server's truth
    }
  }

  function reorderRoots(next: TaxonomyNode[]) {
    setRoots(next);
    void persistOrder(next.map((node) => node.id));
  }

  function reorderChildren(rootId: number, next: TaxonomyNode[]) {
    setRoots((current) =>
      current.map((root) =>
        root.id === rootId ? { ...root, children: next } : root,
      ),
    );
    void persistOrder(next.map((node) => node.id));
  }

  // Optimistically merge an edit into the tree (root or child) so the change shows the instant Save
  // is clicked; the dialog reverts it on failure, and onChanged reconciles with the server on success.
  function patchNode(id: number, changes: Partial<TaxonomyNode>) {
    setRoots((current) =>
      current.map((root) =>
        root.id === id
          ? { ...root, ...changes }
          : {
              ...root,
              children: (root.children ?? []).map((child) =>
                child.id === id ? { ...child, ...changes } : child,
              ),
            },
      ),
    );
  }

  async function toggleActive(node: TaxonomyNode, active: boolean) {
    const response = await fetch(
      `/api/admin/taxonomy/${path}/${node.id}/activation`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      },
    );
    if (!response.ok) {
      toast.error(t("saveError"));
      return;
    }
    onChanged();
  }

  function bindingCount(node: TaxonomyNode): number {
    return "category_ids" in node ? (node.category_ids?.length ?? 0) : 0;
  }

  function Row({ node }: { node: TaxonomyNode }) {
    const bindings = kind === "amenity" ? bindingCount(node) : 0;
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={cn(
            "min-w-0 truncate",
            !node.is_active && "text-muted-foreground",
          )}
        >
          {displayName(node.name, locale)}
        </span>
        <code className="text-muted-foreground/70 hidden shrink-0 text-xs sm:inline">
          {node.slug}
        </code>
        {kind === "amenity" && bindings > 0 ? (
          <Badge variant="outline" className="shrink-0">
            {t("tree.boundCount", { count: bindings })}
          </Badge>
        ) : null}
        {node.usage_count > 0 ? (
          <Badge variant="neutral" className="shrink-0">
            {t("tree.usage", { count: node.usage_count })}
          </Badge>
        ) : null}
        <div className="ms-auto flex shrink-0 items-center gap-3">
          <LocaleAvatars name={node.name} className="hidden md:flex" />
          <Switch
            checked={node.is_active}
            onCheckedChange={(value) => toggleActive(node, value)}
            aria-label={t("tree.active")}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDialog({ mode: "edit", node })}
            aria-label={t("tree.edit")}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPendingDelete(node)}
            aria-label={t("tree.remove")}
          >
            <Trash2 className="text-destructive size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => setDialog({ mode: "create", parentId: null })}
        >
          <Plus className="size-4" />
          {t(`tree.add.${kind}Root`)}
        </Button>
      </div>

      {roots.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-2xl border p-10 text-center text-sm">
          {t("tree.empty")}
        </div>
      ) : (
        <SortableList
          items={roots}
          getId={(node) => String(node.id)}
          onReorder={reorderRoots}
          onDragStart={() => setDragging(true)}
          onDragEnd={() => setDragging(false)}
          className="space-y-4"
          renderOverlay={(node) => (
            <div
              className={cn(
                "bg-background rounded-xl border shadow-lg",
                overlayClass,
              )}
            >
              <div className="flex items-center gap-2 p-3">
                <DragHandle
                  label={t("tree.reorder")}
                  className="cursor-grabbing"
                />
                <span className="truncate text-sm font-medium">
                  {displayName(node.name, locale)}
                </span>
              </div>
            </div>
          )}
          renderItem={(root, render) => {
            const header = (
              <div className="flex items-center gap-2 p-3">
                <DragHandle
                  label={t("tree.reorder")}
                  ref={render.handle.ref}
                  {...render.handle.attributes}
                  {...render.handle.listeners}
                />
                <Row node={root} />
              </div>
            );

            // The dragged row → a header-sized gray drop slot (its content rides the overlay).
            if (render.isDragging) {
              return (
                <div
                  ref={render.setNodeRef}
                  style={render.style}
                  className={cn("rounded-xl", placeholderClass)}
                >
                  <div className="invisible">{header}</div>
                </div>
              );
            }

            // While any root is dragging → collapse every block to just its header.
            if (dragging) {
              return (
                <div
                  ref={render.setNodeRef}
                  style={render.style}
                  className="rounded-xl border"
                >
                  {header}
                </div>
              );
            }

            // At rest → the full block: header + children + add-child.
            return (
              <div
                ref={render.setNodeRef}
                style={render.style}
                className="rounded-xl border"
              >
                {header}
                <div className="border-t p-3 ps-8">
                  {(root.children ?? []).length > 0 ? (
                    <SortableList
                      items={root.children ?? []}
                      getId={(node) => String(node.id)}
                      onReorder={(next) => reorderChildren(root.id, next)}
                      className="space-y-1.5"
                      renderOverlay={(node) => (
                        <div
                          className={cn(
                            "bg-background rounded-md border p-2 shadow-lg",
                            overlayClass,
                          )}
                        >
                          {displayName(node.name, locale)}
                        </div>
                      )}
                      renderItem={(child, childRender) => (
                        <div
                          ref={childRender.setNodeRef}
                          style={childRender.style}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-1.5",
                            childRender.isDragging
                              ? placeholderClass
                              : "hover:bg-muted/50",
                          )}
                        >
                          {!childRender.isDragging ? (
                            <>
                              <DragHandle
                                label={t("tree.reorder")}
                                ref={childRender.handle.ref}
                                {...childRender.handle.attributes}
                                {...childRender.handle.listeners}
                              />
                              <Row node={child} />
                            </>
                          ) : null}
                        </div>
                      )}
                    />
                  ) : null}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground mt-1"
                    onClick={() =>
                      setDialog({ mode: "create", parentId: root.id })
                    }
                  >
                    <Plus className="size-4" />
                    {t(`tree.add.${kind}Child`)}
                  </Button>
                </div>
              </div>
            );
          }}
        />
      )}

      {dialog ? (
        <NodeDialog
          kind={kind}
          open
          onOpenChange={(open) => (open ? null : setDialog(null))}
          node={dialog.mode === "edit" ? dialog.node : null}
          parentId={dialog.mode === "create" ? dialog.parentId : null}
          categories={categories}
          onSaved={onChanged}
          onOptimisticEdit={patchNode}
        />
      ) : null}

      {pendingDelete ? (
        <DeleteNodeDialog
          kind={kind}
          open
          onOpenChange={(open) => (open ? null : setPendingDelete(null))}
          node={pendingDelete}
          onDone={onChanged}
        />
      ) : null}
    </div>
  );
}
