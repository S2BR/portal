import { Pencil, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A muted rounded tile for a settings row, matching the /portal dashboard's stat tiles: an icon in a
 * rounded square, then either a small label over a prominent value (a field), or a prominent title
 * over a muted subtitle (a list item). With `onClick` the whole tile is a button (hover highlight + a
 * pencil affordance); otherwise pass a trailing `action` (buttons/badges). `tone="danger"` tints it
 * for destructive rows.
 */
export function SettingTile({
  icon: Icon,
  label,
  subtitle,
  children,
  onClick,
  action,
  tone = "default",
  className,
}: {
  icon: LucideIcon;
  /** Small label above the value (field shape). Omit for the title+subtitle (list) shape. */
  label?: string;
  /** Muted line below the title (list shape). */
  subtitle?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  action?: ReactNode;
  tone?: "default" | "danger";
  className?: string;
}) {
  const danger = tone === "danger";

  const body = (
    <>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          danger
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        {label ? (
          <>
            <p className="text-muted-foreground text-xs">{label}</p>
            <div className="truncate text-base font-semibold">{children}</div>
          </>
        ) : (
          <>
            <div className="truncate text-sm font-semibold">{children}</div>
            {subtitle ? (
              <p className="text-muted-foreground text-xs">{subtitle}</p>
            ) : null}
          </>
        )}
      </div>
      {onClick ? (
        <Pencil
          aria-hidden
          className="text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        />
      ) : action ? (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      ) : null}
    </>
  );

  if (!onClick) {
    return (
      <div
        className={cn(
          "flex w-full items-center gap-3 rounded-xl p-4",
          danger ? "bg-destructive/5" : "bg-muted/40",
          className,
        )}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group focus-visible:ring-ring flex w-full items-center gap-3 rounded-xl p-4 text-start transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset",
        danger
          ? "bg-destructive/5 hover:bg-destructive/10"
          : "bg-muted/40 hover:bg-muted/70",
        className,
      )}
    >
      {body}
    </button>
  );
}

/**
 * The expanded state of a setting tile: the same muted block with a 1px border (a real border, not a
 * ring, so the settings card's overflow-hidden can't clip it), an icon + label header with an
 * optional header `action`, then the field's control(s).
 */
export function SettingBlock({
  icon: Icon,
  label,
  action,
  children,
  className,
}: {
  icon: LucideIcon;
  label: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-muted/40 border-ring/50 space-y-3 rounded-xl border p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-muted-foreground flex items-center gap-2">
          <Icon className="size-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
