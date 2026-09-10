import { Store } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * A business's logo: its picture when there is one, otherwise a storefront icon — the rounded-square
 * counterpart to the circular {@link UserAvatar}, kept consistent everywhere it appears. The radius
 * is a px token (`rounded-xl` by default), NOT a percentage: Safari clips `overflow:hidden` to a px
 * radius but not a percentage one, so a percentage renders square there. Pass a matching `rounded-*`
 * in `className` for sizes far from the size-10 default. When `color` (the business's brand color) is
 * given, the icon fallback is tinted in tones of it — theme-safe, since the tint is layered over the
 * plate rather than replacing it; without it the fallback is neutral.
 */
export function BusinessLogo({
  name,
  src,
  color,
  className,
  fallbackClassName,
  fallback,
}: {
  name: string;
  src?: string | null;
  /** The business's brand color (any CSS color); tints the icon fallback in tones of it. */
  color?: string | null;
  className?: string;
  /** Override the fallback chip (weight, size, colors). */
  fallbackClassName?: string;
  /** Replace the storefront icon with custom content. */
  fallback?: ReactNode;
}) {
  // Layer the brand color over the plate (color-mix with transparent), so tones read in both themes.
  const tinted: CSSProperties | undefined = color
    ? {
        background: `linear-gradient(135deg, color-mix(in oklab, ${color} 26%, transparent), color-mix(in oklab, ${color} 10%, transparent))`,
        color: `color-mix(in oklab, ${color} 70%, var(--muted-foreground))`,
      }
    : undefined;

  return (
    <Avatar className={cn("size-10 rounded-xl", className)}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback
        // With a src, delay the icon so a cached logo (e.g. after a re-mount) paints first and never
        // flashes to the placeholder. With no src, show it at once.
        delayMs={src ? 600 : undefined}
        className={cn(
          "rounded-[inherit] select-none",
          !color && "bg-muted text-muted-foreground",
          fallbackClassName,
        )}
        style={tinted}
      >
        {fallback ?? (
          <Store className="size-1/2" strokeWidth={1.5} aria-hidden />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
