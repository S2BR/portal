"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type CSSProperties, type ReactNode, useState } from "react";

/** What each item's render function receives to wire itself up as a sortable row. */
export type SortableItemRender = {
  /** Set on the row's outermost element so dnd-kit can measure/move it. */
  setNodeRef: (node: HTMLElement | null) => void;
  /** The reorder transform + transition — spread onto the row element's `style`. */
  style: CSSProperties;
  /** True for the row currently being dragged (render it as the drop placeholder). */
  isDragging: boolean;
  /** Spread onto the drag handle: `<DragHandle ref={handle.ref} {...handle.attributes} {...handle.listeners} />`. */
  handle: {
    ref: (node: HTMLElement | null) => void;
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
};

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (render: SortableItemRender) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <>
      {children({
        setNodeRef,
        style,
        isDragging,
        handle: { ref: setActivatorNodeRef, attributes, listeners },
      })}
    </>
  );
}

/**
 * A vertical drag-to-reorder list on dnd-kit. The dragged row leaves a gray placeholder in its slot
 * (rendered by `renderItem` when `isDragging`), while a floating copy follows the cursor (rendered by
 * `renderOverlay`). `onReorder` fires once, on drop, with the new order. `onDragStart`/`onDragEnd` let
 * a parent react to the drag lifecycle (e.g. collapse big rows while dragging).
 */
export function SortableList<T>({
  items,
  getId,
  onReorder,
  onDragStart,
  onDragEnd,
  renderItem,
  renderOverlay,
  className,
}: {
  items: T[];
  getId: (item: T) => string;
  onReorder: (items: T[]) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  renderItem: (item: T, render: SortableItemRender) => ReactNode;
  renderOverlay: (item: T) => ReactNode;
  className?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    // A few px of travel before a drag starts, so a click on the handle still behaves like a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = items.map(getId);
  const activeItem =
    activeId === null ? null : (items.find((item) => getId(item) === activeId) ?? null);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    onDragEnd?.();
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from !== -1 && to !== -1) {
        onReorder(arrayMove(items, from, to));
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => {
        setActiveId(String(event.active.id));
        onDragStart?.();
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        onDragEnd?.();
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item) => (
            <SortableRow key={getId(item)} id={getId(item)}>
              {(render) => renderItem(item, render)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
      <DragOverlay>{activeItem ? renderOverlay(activeItem) : null}</DragOverlay>
    </DndContext>
  );
}
