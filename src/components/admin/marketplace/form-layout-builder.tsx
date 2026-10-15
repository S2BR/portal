"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { LocaleTextField } from "@/components/admin/marketplace/locale-text-field";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiErrorText } from "@/lib/api/error-text";
import {
  cleanLocaleMap,
  readText,
  type AdminCategory,
  type AdminField,
  type AdminLayoutItem,
  type LocaleMap,
} from "@/lib/marketplace/admin";
import {
  buildRenderPlan,
  CORE_FIELDS,
  FIELD_WIDTHS,
  SPECIAL_FIELDS,
  WIDTH_COLS,
  type FieldWidth,
} from "@/lib/marketplace/layout";
import { cn } from "@/lib/utils";

const PALETTE = "palette";

type Item = AdminLayoutItem;
type SectionMeta = { id: string; name: LocaleMap };
type ItemsBy = Record<string, Item[]>;

const itemId = (item: Item) => `${item.kind}:${item.key}`;
const genId = () =>
  `sec_${globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10)}`;

/** Build the initial builder state from the saved layout, or a sensible default when none exists. */
function initialState(
  category: AdminCategory,
  fields: AdminField[],
): { sections: SectionMeta[]; itemsBy: ItemsBy } {
  const validAttr = new Set(fields.map((f) => f.key));
  // Special shortcuts (e.g. VIN decode) are only offered for categories with vehicle fields.
  const hasVehicle = fields.some((f) => f.source?.startsWith("vehicle_"));
  const specialKeys = hasVehicle ? SPECIAL_FIELDS : [];
  const coreSet = new Set<string>(CORE_FIELDS);
  const specialSet = new Set<string>(specialKeys);
  const isValid = (item: Item) =>
    item.kind === "core"
      ? coreSet.has(item.key)
      : item.kind === "special"
        ? specialSet.has(item.key)
        : validAttr.has(item.key);

  const sections: SectionMeta[] = [];
  const itemsBy: ItemsBy = { [PALETTE]: [] };
  const placed = new Set<string>();

  const saved = category.form_layout?.sections ?? [];
  if (saved.length > 0) {
    for (const section of saved) {
      const id = section.id || genId();
      sections.push({ id, name: section.name ?? {} });
      itemsBy[id] = section.items.filter(isValid);
      for (const item of itemsBy[id]) {
        placed.add(itemId(item));
      }
    }
  } else {
    const id = genId();
    sections.push({ id, name: {} });
    // Seed from the renderer's built-in default so the admin starts from the current look.
    itemsBy[id] =
      buildRenderPlan(
        null,
        fields.map((f) => f.key),
      )[0]?.items ?? [];
    for (const item of itemsBy[id]) {
      placed.add(itemId(item));
    }
  }

  const all: Item[] = [
    ...CORE_FIELDS.map((key): Item => ({ kind: "core", key, width: "full" })),
    ...specialKeys.map((key): Item => ({ kind: "special", key, width: "full" })),
    ...fields.map((f): Item => ({ kind: "attribute", key: f.key, width: "full" })),
  ];
  itemsBy[PALETTE] = all.filter((item) => !placed.has(itemId(item)));

  return { sections, itemsBy };
}

/**
 * The per-category post-form layout designer: drag built-in and dynamic fields into ordered sections,
 * set each one's width, and preview the resulting responsive grid. Saving writes the layout to the
 * category; "Clear" removes it (the form falls back to its default order). The API re-validates and is
 * the real gate.
 */
export function FormLayoutBuilder({
  category,
  fields,
  onClose,
}: {
  category: AdminCategory;
  fields: AdminField[];
  onClose: () => void;
}) {
  const t = useTranslations("admin.marketplace");
  const initial = useMemo(
    () => initialState(category, fields),
    [category, fields],
  );
  const [sections, setSections] = useState<SectionMeta[]>(initial.sections);
  const [itemsBy, setItemsBy] = useState<ItemsBy>(initial.itemsBy);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelFor = useMemo(() => {
    const map = new Map<string, string>();
    for (const key of CORE_FIELDS) {
      map.set(`core:${key}`, t(`layout.core.${key}`));
    }
    for (const key of SPECIAL_FIELDS) {
      map.set(`special:${key}`, t(`layout.special.${key}`));
    }
    for (const field of fields) {
      map.set(`attribute:${field.key}`, readText(field.label) || field.key);
    }
    return map;
  }, [fields, t]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const containerKeys = useMemo(
    () => [PALETTE, ...sections.map((s) => s.id)],
    [sections],
  );

  function findContainer(id: string): string | undefined {
    if (containerKeys.includes(id)) {
      return id;
    }
    return containerKeys.find((key) =>
      (itemsBy[key] ?? []).some((item) => itemId(item) === id),
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      return;
    }
    const from = findContainer(String(active.id));
    const to = findContainer(String(over.id));
    if (!from || !to || from === to) {
      return;
    }
    setItemsBy((prev) => {
      const fromItems = prev[from] ?? [];
      const toItems = prev[to] ?? [];
      const activeIndex = fromItems.findIndex(
        (item) => itemId(item) === active.id,
      );
      const moving = fromItems[activeIndex];
      if (!moving) {
        return prev;
      }
      const overIsContainer = containerKeys.includes(String(over.id));
      const overIndex = overIsContainer
        ? toItems.length
        : toItems.findIndex((item) => itemId(item) === over.id);
      const insertAt = overIndex === -1 ? toItems.length : overIndex;
      return {
        ...prev,
        [from]: fromItems.filter((_, i) => i !== activeIndex),
        [to]: [
          ...toItems.slice(0, insertAt),
          moving,
          ...toItems.slice(insertAt),
        ],
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) {
      return;
    }
    const from = findContainer(String(active.id));
    const to = findContainer(String(over.id));
    if (!from || !to || from !== to) {
      return;
    }
    setItemsBy((prev) => {
      const items = prev[from] ?? [];
      const oldIndex = items.findIndex((item) => itemId(item) === active.id);
      const newIndex = containerKeys.includes(String(over.id))
        ? items.length - 1
        : items.findIndex((item) => itemId(item) === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
        return prev;
      }
      return { ...prev, [from]: arrayMove(items, oldIndex, newIndex) };
    });
  }

  function setWidth(sectionId: string, id: string, width: FieldWidth) {
    setItemsBy((prev) => ({
      ...prev,
      [sectionId]: (prev[sectionId] ?? []).map((item) =>
        itemId(item) === id ? { ...item, width } : item,
      ),
    }));
  }

  function removeToPalette(sectionId: string, id: string) {
    setItemsBy((prev) => {
      const moving = (prev[sectionId] ?? []).find(
        (item) => itemId(item) === id,
      );
      if (!moving) {
        return prev;
      }
      return {
        ...prev,
        [sectionId]: (prev[sectionId] ?? []).filter(
          (item) => itemId(item) !== id,
        ),
        [PALETTE]: [...(prev[PALETTE] ?? []), { ...moving, width: "full" }],
      };
    });
  }

  function addSection() {
    const id = genId();
    setSections((prev) => [...prev, { id, name: {} }]);
    setItemsBy((prev) => ({ ...prev, [id]: [] }));
  }

  function removeSection(id: string) {
    setItemsBy((prev) => {
      const { [id]: freed = [], ...rest } = prev;
      return { ...rest, [PALETTE]: [...(rest[PALETTE] ?? []), ...freed] };
    });
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function renameSection(id: string, name: LocaleMap) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }

  function moveSection(index: number, delta: number) {
    setSections((prev) => {
      const next = index + delta;
      if (next < 0 || next >= prev.length) {
        return prev;
      }
      return arrayMove(prev, index, next);
    });
  }

  async function save(clear = false) {
    setSaving(true);
    try {
      const payload = clear
        ? { sections: [] }
        : {
            sections: sections.map((section) => ({
              id: section.id,
              name: cleanLocaleMap(section.name),
              items: (itemsBy[section.id] ?? []).map((item) => ({
                kind: item.kind,
                key: item.key,
                width: item.width,
              })),
            })),
          };

      const res = await fetch(
        `/api/admin/marketplace/categories/${category.id}/layout`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
          errors?: Record<string, string[]>;
        };
        toast.error(apiErrorText(data) ?? t("error"));
        return;
      }
      toast.success(clear ? t("layout.cleared") : t("layout.saved"));
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const paletteItems = itemsBy[PALETTE] ?? [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            {t("layout.heading", { type: readText(category.name) })}
          </h2>
          <p className="text-muted-foreground text-sm">{t("layout.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("layout.cancel")}
          </Button>
          <Button
            variant="outline"
            onClick={() => void save(true)}
            disabled={saving}
          >
            {t("layout.clear")}
          </Button>
          <Button onClick={() => void save(false)} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("layout.save")}
          </Button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            {sections.map((section, index) => (
              <SectionCard
                key={section.id}
                section={section}
                index={index}
                total={sections.length}
                items={itemsBy[section.id] ?? []}
                labelFor={labelFor}
                t={t}
                onRename={(name) => renameSection(section.id, name)}
                onRemove={() => removeSection(section.id)}
                onMove={(delta) => moveSection(index, delta)}
                onWidth={(id, width) => setWidth(section.id, id, width)}
                onRemoveItem={(id) => removeToPalette(section.id, id)}
              />
            ))}

            <Button variant="outline" onClick={addSection} className="w-full">
              <Plus className="size-4" />
              {t("layout.addSection")}
            </Button>
          </div>

          <aside className="space-y-4">
            <Palette items={paletteItems} labelFor={labelFor} t={t} />
            <LayoutPreview
              sections={sections}
              itemsBy={itemsBy}
              labelFor={labelFor}
              t={t}
            />
          </aside>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="bg-background flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm shadow-lg">
              <GripVertical className="text-muted-foreground size-4" />
              {labelFor.get(activeId) ?? activeId}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/** The unplaced-fields tray — a drop target that holds every field not currently in a section. */
function Palette({
  items,
  labelFor,
  t,
}: {
  items: Item[];
  labelFor: Map<string, string>;
  t: ReturnType<typeof useTranslations>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: PALETTE });
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{t("layout.palette")}</h3>
      <SortableContext
        items={items.map(itemId)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "min-h-24 space-y-1.5 rounded-xl border border-dashed p-2.5 transition-colors",
            isOver && "border-primary bg-primary/5",
          )}
        >
          {items.length === 0 ? (
            <p className="text-muted-foreground px-1 py-3 text-center text-xs">
              {t("layout.paletteEmpty")}
            </p>
          ) : (
            items.map((item) => (
              <FieldChip
                key={itemId(item)}
                id={itemId(item)}
                label={labelFor.get(itemId(item)) ?? item.key}
                kind={item.kind}
                t={t}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SectionCard({
  section,
  index,
  total,
  items,
  labelFor,
  t,
  onRename,
  onRemove,
  onMove,
  onWidth,
  onRemoveItem,
}: {
  section: SectionMeta;
  index: number;
  total: number;
  items: Item[];
  labelFor: Map<string, string>;
  t: ReturnType<typeof useTranslations>;
  onRename: (name: LocaleMap) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
  onWidth: (id: string, width: FieldWidth) => void;
  onRemoveItem: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: section.id });
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <LocaleTextField
            label={t("layout.sectionName")}
            value={section.name}
            onChange={onRename}
            placeholder={t("layout.sectionNamePlaceholder")}
          />
        </div>
        <div className="mt-6 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label={t("layout.moveSectionUp")}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label={t("layout.moveSectionDown")}
          >
            <ChevronDown className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={t("layout.removeSection")}
          >
            <Trash2 className="text-destructive size-4" />
          </Button>
        </div>
      </div>

      <SortableContext
        items={items.map(itemId)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "min-h-16 space-y-1.5 rounded-lg border border-dashed p-2 transition-colors",
            isOver && "border-primary bg-primary/5",
          )}
        >
          {items.length === 0 ? (
            <p className="text-muted-foreground px-1 py-3 text-center text-xs">
              {t("layout.sectionEmpty")}
            </p>
          ) : (
            items.map((item) => (
              <FieldChip
                key={itemId(item)}
                id={itemId(item)}
                label={labelFor.get(itemId(item)) ?? item.key}
                kind={item.kind}
                width={item.width}
                onWidth={(width) => onWidth(itemId(item), width)}
                onRemove={() => onRemoveItem(itemId(item))}
                t={t}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

/** A draggable field chip. In a section it also shows a width selector + remove; in the palette, bare. */
function FieldChip({
  id,
  label,
  kind,
  width,
  onWidth,
  onRemove,
  t,
}: {
  id: string;
  label: string;
  kind: Item["kind"];
  width?: FieldWidth;
  onWidth?: (width: FieldWidth) => void;
  onRemove?: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const tag =
    kind === "core"
      ? t("layout.coreTag")
      : kind === "special"
        ? t("layout.specialTag")
        : null;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-background flex items-center gap-2 rounded-lg border px-2 py-1.5",
        isDragging && "opacity-40",
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none"
        aria-label={t("layout.drag")}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="flex-1 truncate text-sm">
        {label}
        {tag ? (
          <span className="text-muted-foreground ml-1.5 text-[10px] tracking-wide uppercase">
            {tag}
          </span>
        ) : null}
      </span>
      {width && onWidth ? (
        <Select value={width} onValueChange={(v) => onWidth(v as FieldWidth)}>
          <SelectTrigger className="h-8 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_WIDTHS.map((w) => (
              <SelectItem key={w} value={w}>
                {t(`layout.width.${w}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {onRemove ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={t("layout.removeField")}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

/** A read-only preview of the resulting responsive grid. */
function LayoutPreview({
  sections,
  itemsBy,
  labelFor,
  t,
}: {
  sections: SectionMeta[];
  itemsBy: ItemsBy;
  labelFor: Map<string, string>;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{t("layout.preview")}</h3>
      <div className="bg-muted/30 space-y-4 rounded-xl border p-3">
        {sections.map((section) => {
          const items = itemsBy[section.id] ?? [];
          return (
            <div key={section.id} className="space-y-1.5">
              {readText(section.name) ? (
                <p className="text-xs font-semibold">
                  {readText(section.name)}
                </p>
              ) : null}
              <div className="grid grid-cols-6 gap-1.5">
                {items.map((item) => (
                  <div
                    key={itemId(item)}
                    className="bg-background truncate rounded border px-1.5 py-1 text-center text-[10px]"
                    style={{ gridColumn: `span ${WIDTH_COLS[item.width]}` }}
                  >
                    {labelFor.get(itemId(item)) ?? item.key}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <p className="text-muted-foreground text-[10px]">
          {t("layout.previewHint")}
        </p>
      </div>
    </div>
  );
}
