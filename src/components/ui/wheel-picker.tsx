"use client";

import { useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  clampDay,
  daysInMonth,
  fieldOrder,
  fromISO,
  monthLabels,
  toISO,
  yearBounds,
  type DateField,
} from "@/lib/date-wheel";
import { cn } from "@/lib/utils";

const ITEM_HEIGHT = 40;
const VISIBLE = 5; // odd — the middle row is the selection
const HALF = (VISIBLE - 1) / 2;

export type WheelItem = { value: string; label: string };

/**
 * A short "tick" via the Web Audio API — the sound an iOS wheel makes at each detent. One lazily
 * created AudioContext (a scroll gesture satisfies autoplay policy); no audio asset (CSP-safe,
 * offline). Returns a no-op if Web Audio is unavailable.
 */
function useWheelTick(): () => void {
  const contextRef = useRef<AudioContext | null>(null);

  return useCallback(() => {
    try {
      if (!contextRef.current) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctor) {
          return;
        }
        contextRef.current = new Ctor();
      }
      const context = contextRef.current;
      if (context.state === "suspended") {
        void context.resume();
      }
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = 900;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.06);
    } catch {
      // Audio is a nicety; never let it break the picker.
    }
  }, []);
}

/**
 * A single scrolling wheel column: a CSS scroll-snap list whose centered row is the selection. As it
 * scrolls, rows curve away (rotateX + fade) for the 3D wheel look, a tick plays at each new detent,
 * and the snapped value is reported. Keyboard: Arrow Up/Down move the selection. Reduced motion drops
 * the 3D curve and smooth scrolling (it still snaps).
 */
export function WheelPicker({
  items,
  value,
  onChange,
  ariaLabel,
  showBand = true,
  className,
}: {
  items: WheelItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  showBand?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tick = useWheelTick();
  const frame = useRef<number | null>(null);
  const programmatic = useRef(false);
  const lastIndex = useRef(-1);

  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );

  const applyTransforms = useCallback(
    (center: number) => {
      for (let index = 0; index < itemRefs.current.length; index += 1) {
        const element = itemRefs.current[index];
        if (!element) {
          continue;
        }
        const distance = index - center;
        if (Math.abs(distance) > HALF + 0.5) {
          element.style.opacity = "0";
          element.style.transform = "";
          continue;
        }
        element.style.opacity = String(Math.max(0, 1 - Math.abs(distance) * 0.24));
        element.style.transform = reduce
          ? ""
          : `rotateX(${distance * -22}deg) scale(${1 - Math.min(Math.abs(distance) * 0.06, 0.24)})`;
      }
    },
    [reduce],
  );

  const handleScroll = useCallback(() => {
    if (frame.current != null) {
      return;
    }
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const element = scrollRef.current;
      if (!element) {
        return;
      }
      const center = element.scrollTop / ITEM_HEIGHT;
      applyTransforms(center);
      const index = Math.round(center);
      if (index === lastIndex.current || index < 0 || index >= items.length) {
        return;
      }
      const previous = lastIndex.current;
      lastIndex.current = index;
      // Skip the settle from a programmatic/initial scroll — only user movement ticks + reports.
      if (!programmatic.current && previous !== -1) {
        if (!reduce) {
          tick();
        }
        onChange(items[index]!.value);
      }
    });
  }, [applyTransforms, items, onChange, reduce, tick]);

  // Center the selected value on mount and whenever it changes from outside (e.g. a clamped day),
  // without emitting or ticking. The position is set synchronously and re-asserted after the first
  // paint, since scroll-snap + late layout can otherwise clamp the initial scrollTop back to 0.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const target = selectedIndex * ITEM_HEIGHT;
    if (Math.round(element.scrollTop / ITEM_HEIGHT) === selectedIndex) {
      lastIndex.current = selectedIndex;
      applyTransforms(element.scrollTop / ITEM_HEIGHT);
      return;
    }
    programmatic.current = true;
    lastIndex.current = selectedIndex;
    const settle = () => {
      element.scrollTop = target;
      applyTransforms(selectedIndex);
    };
    settle();
    const raf = requestAnimationFrame(settle);
    const timer = setTimeout(() => {
      programmatic.current = false;
    }, 150);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [selectedIndex, applyTransforms, items.length]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const delta =
      event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (delta === 0) {
      return;
    }
    event.preventDefault();
    const next = Math.min(items.length - 1, Math.max(0, selectedIndex + delta));
    scrollRef.current?.scrollTo({
      top: next * ITEM_HEIGHT,
      behavior: reduce ? "auto" : "smooth",
    });
  };

  return (
    <div className={cn("relative", className)} style={{ height: VISIBLE * ITEM_HEIGHT }}>
      {showBand ? (
        <div
          aria-hidden
          className="bg-muted/60 pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-md"
          style={{ height: ITEM_HEIGHT }}
        />
      ) : null}
      <div
        ref={scrollRef}
        role="listbox"
        aria-label={ariaLabel}
        tabIndex={0}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className="focus-visible:ring-ring h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain rounded-md outline-none focus-visible:ring-2 [&::-webkit-scrollbar]:hidden"
        style={{
          scrollbarWidth: "none",
          perspective: reduce ? undefined : 700,
        }}
      >
        <div style={{ height: HALF * ITEM_HEIGHT }} />
        {items.map((item, index) => (
          <div
            key={item.value}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            role="option"
            aria-selected={index === selectedIndex}
            className="flex snap-center items-center justify-center text-sm tabular-nums select-none"
            style={{ height: ITEM_HEIGHT }}
          >
            {item.label}
          </div>
        ))}
        <div style={{ height: HALF * ITEM_HEIGHT }} />
      </div>
    </div>
  );
}

/**
 * A date-of-birth picker: three {@see WheelPicker}s (year / month / day) laid out in the locale's own
 * field order, with the day count clamping to the chosen month/year and years capped at `minAge`.
 * Emits `YYYY-MM-DD` only when the user moves a wheel (a null `value` seeds a sensible default but
 * doesn't emit until touched).
 */
export function DateWheelPicker({
  value,
  onChange,
  locale,
  minAge = 13,
  labels,
  className,
}: {
  value: string | null;
  onChange: (iso: string) => void;
  locale: string;
  minAge?: number;
  labels: { year: string; month: string; day: string };
  className?: string;
}) {
  const currentYear = new Date().getFullYear();
  const { min, max } = yearBounds(minAge, currentYear);

  const [parts, setParts] = useState(
    () => fromISO(value ?? "") ?? { year: max - 12, month: 1, day: 1 },
  );

  // Re-seed if the external value changes (e.g. edit form re-opened / reset).
  useEffect(() => {
    const parsed = fromISO(value ?? "");
    if (parsed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setParts(parsed);
    }
  }, [value]);

  const update = (next: Partial<typeof parts>) => {
    const merged = { ...parts, ...next };
    merged.day = clampDay(merged.day, merged.year, merged.month);
    setParts(merged);
    onChange(toISO(merged));
  };

  const yearItems = useMemo(() => {
    const list: WheelItem[] = [];
    for (let year = max; year >= min; year -= 1) {
      list.push({ value: String(year), label: String(year) });
    }
    return list;
  }, [max, min]);

  const monthItems = useMemo(
    () =>
      monthLabels(locale).map((label, index) => ({
        value: String(index + 1),
        label,
      })),
    [locale],
  );

  const dayItems = useMemo(
    () =>
      Array.from({ length: daysInMonth(parts.year, parts.month) }, (_, index) => ({
        value: String(index + 1),
        label: String(index + 1),
      })),
    [parts.year, parts.month],
  );

  const wheels: Record<DateField, ReactNode> = {
    year: (
      <WheelPicker
        key="year"
        showBand={false}
        ariaLabel={labels.year}
        items={yearItems}
        value={String(parts.year)}
        onChange={(next) => update({ year: Number(next) })}
        className="flex-[1.2]"
      />
    ),
    month: (
      <WheelPicker
        key="month"
        showBand={false}
        ariaLabel={labels.month}
        items={monthItems}
        value={String(parts.month)}
        onChange={(next) => update({ month: Number(next) })}
        className="flex-[1.6]"
      />
    ),
    day: (
      <WheelPicker
        key="day"
        showBand={false}
        ariaLabel={labels.day}
        items={dayItems}
        value={String(parts.day)}
        onChange={(next) => update({ day: Number(next) })}
        className="flex-1"
      />
    ),
  };

  return (
    <div
      className={cn(
        "bg-card relative flex overflow-hidden rounded-lg border px-2",
        className,
      )}
    >
      {/* The selection band across all three wheels. */}
      <div
        aria-hidden
        className="border-border/70 bg-muted/40 pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 border-y"
        style={{ height: ITEM_HEIGHT }}
      />
      {/* Edge fades so rows dissolve into the container, iOS-style. */}
      <div
        aria-hidden
        className="from-card pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b to-transparent"
        style={{ height: HALF * ITEM_HEIGHT }}
      />
      <div
        aria-hidden
        className="to-card pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-b from-transparent"
        style={{ height: HALF * ITEM_HEIGHT }}
      />
      {fieldOrder(locale).map((field) => wheels[field])}
    </div>
  );
}
