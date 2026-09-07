"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Package } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

import type { ProductSection } from "@/app/api/businesses/[slug]/product-sections/route";
import type { CatalogSighting } from "@/app/api/businesses/[slug]/products/route";
import { useSectionPersist } from "@/lib/products/use-section-persist";
import { unitFor } from "@/lib/products/units";
import { displayName, type LocaleText } from "@/lib/taxonomy/admin";
import { cn } from "@/lib/utils";

/** The synthetic column for products in no section. */
const UNASSIGNED = "__unassigned__";

const cardDndId = (columnId: string, productId: string) =>
  `card:${columnId}:${productId}`;
const columnDndId = (columnId: string) => `column:${columnId}`;

/** Parse a card DnD id back into its column + product. */
function parseCardId(id: string): { columnId: string; productId: string } {
  const [, columnId = "", productId = ""] = id.split(":");
  return { columnId, productId };
}

/** A product's short quantity label (size + unit, or the variant label). */
function quantityLabel(sighting: CatalogSighting): string {
  const size = sighting.variant?.size;
  const unit = unitFor(sighting.variant?.unit)?.symbol;
  return (
    [size, unit].filter((part): part is string => Boolean(part)).join(" ") ||
    sighting.variant?.label ||
    ""
  );
}

/** The visual of a product card — cover thumb, name, quantity. Shared by the columns and the overlay. */
function CardBody({ sighting }: { sighting: CatalogSighting }) {
  const product = sighting.variant?.product ?? null;
  const image = sighting.cover_image ?? product?.image ?? null;
  const quantity = quantityLabel(sighting);
  return (
    <div className="bg-card flex items-center gap-2.5 rounded-lg border p-2 shadow-sm">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
        <img
          src={image}
          alt=""
          className="size-9 shrink-0 rounded-md border object-cover"
        />
      ) : (
        <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md border">
          <Package className="size-4" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{product?.name ?? "—"}</p>
        {quantity ? (
          <p className="text-muted-foreground truncate text-xs tabular-nums">
            {quantity}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** A draggable product card within a column. */
function KanbanCard({
  columnId,
  sighting,
}: {
  columnId: string;
  sighting: CatalogSighting;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: cardDndId(columnId, sighting.id) });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <CardBody sighting={sighting} />
    </div>
  );
}

/** A droppable column — its header, count, and cards (or an empty hint). */
function KanbanColumn({
  id,
  label,
  sightings,
  emptyHint,
}: {
  id: string;
  label: string;
  sightings: CatalogSighting[];
  emptyHint: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDndId(id) });
  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <span className="truncate text-sm font-semibold">{label}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {sightings.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "bg-muted/40 min-h-40 flex-1 space-y-2 rounded-xl border border-transparent p-2 transition-colors",
          isOver && "border-primary/60 bg-primary/5",
        )}
      >
        {sightings.length === 0 ? (
          <p className="text-muted-foreground px-1 py-6 text-center text-xs">
            {emptyHint}
          </p>
        ) : (
          sightings.map((sighting) => (
            <KanbanCard key={sighting.id} columnId={id} sighting={sighting} />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * The "Board" tab — a Kanban of the catalog. Every product is a card; the "Unassigned" column holds
 * products in no section, and there's a column per section. Drag a card between columns to change its
 * section membership (products are many-to-many, so a card shows in each section it's in). Every move
 * applies instantly and persists in the background — no reload.
 */
export function SectionKanban({
  slug,
  products,
  sections,
  onSectionsChange,
}: {
  slug: string;
  products: CatalogSighting[];
  sections: ProductSection[];
  onSectionsChange: Dispatch<SetStateAction<ProductSection[]>>;
}) {
  const t = useTranslations("businesses.products");
  const locale = useLocale();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { setProducts } = useSectionPersist(slug, onSectionsChange, () =>
    toast.error(t("actionError")),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const productById = new Map(
    products.map((sighting) => [sighting.id, sighting]),
  );
  const assigned = new Set(
    sections.flatMap((section) => section.product_ids ?? []),
  );
  const unassigned = products.filter((sighting) => !assigned.has(sighting.id));

  const columns = [
    { id: UNASSIGNED, label: t("kanban.unassigned"), sightings: unassigned },
    ...sections.map((section) => ({
      id: section.id,
      label: displayName(section.name as LocaleText, locale),
      sightings: (section.product_ids ?? [])
        .map((id) => productById.get(id))
        .filter((sighting): sighting is CatalogSighting => Boolean(sighting)),
    })),
  ];

  const activeSighting = activeId
    ? (productById.get(parseCardId(activeId).productId) ?? null)
    : null;

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) {
      return;
    }
    const from = parseCardId(String(active.id));
    const overId = String(over.id);
    const toColumn = overId.startsWith("column:")
      ? overId.slice("column:".length)
      : overId.startsWith("card:")
        ? parseCardId(overId).columnId
        : null;
    if (toColumn === null || toColumn === from.columnId) {
      return;
    }

    // Remove the membership being dragged from its source section (if any)...
    if (from.columnId !== UNASSIGNED) {
      const source = sections.find((section) => section.id === from.columnId);
      if (source) {
        setProducts(
          from.columnId,
          (source.product_ids ?? []).filter((id) => id !== from.productId),
        );
      }
    }
    // ...and add it to the target section (if the target is a section, not Unassigned).
    if (toColumn !== UNASSIGNED) {
      const target = sections.find((section) => section.id === toColumn);
      if (target && !(target.product_ids ?? []).includes(from.productId)) {
        setProducts(toColumn, [...(target.product_ids ?? []), from.productId]);
      }
    }
  };

  if (products.length === 0) {
    return (
      <p className="text-muted-foreground text-sm italic">
        {t("kanban.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">{t("kanban.hint")}</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(event: DragStartEvent) =>
          setActiveId(String(event.active.id))
        }
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              label={column.label}
              sightings={column.sightings}
              emptyHint={
                column.id === UNASSIGNED
                  ? t("kanban.allAssigned")
                  : t("kanban.dropHere")
              }
            />
          ))}
        </div>
        <DragOverlay>
          {activeSighting ? (
            <div className="w-60 rotate-1 cursor-grabbing">
              <CardBody sighting={activeSighting} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
