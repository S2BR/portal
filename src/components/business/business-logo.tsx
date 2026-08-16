import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/initials";
import { cn } from "@/lib/utils";

/**
 * A business's logo: its picture when there is one, otherwise its initials — the rounded-square
 * counterpart to the circular {@link UserAvatar}, kept consistent everywhere it appears. The radius
 * is a px token (`rounded-xl` by default), NOT a percentage: Safari clips `overflow:hidden` to a px
 * radius but not a percentage one, so a percentage renders square there. Pass a matching `rounded-*`
 * in `className` for sizes far from the size-10 default; pass `fallback` to show an icon instead of
 * the initials. The fallback inherits the root radius, so it always matches.
 */
export function BusinessLogo({
  name,
  src,
  className,
  fallbackClassName,
  fallback,
}: {
  name: string;
  src?: string | null;
  className?: string;
  /** Override the fallback chip (weight, size, colors). */
  fallbackClassName?: string;
  /** Replace the initials with custom content (e.g. a business-type icon). */
  fallback?: ReactNode;
}) {
  return (
    <Avatar className={cn("size-10 rounded-xl", className)}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback
        // With a src, delay the initials so a cached logo (e.g. after a re-mount) paints first and
        // never flashes to initials. With no src, show them at once.
        delayMs={src ? 600 : undefined}
        className={cn(
          // Matches UserAvatar's chip so avatars and logos read as one family. `rounded-[inherit]`
          // takes the root's radius; `text-background!` wins over a parent's hover text color;
          // `leading-none` optically centers the initials.
          "rounded-[inherit] bg-foreground text-background! text-xs leading-none font-extrabold select-none",
          fallbackClassName,
        )}
      >
        {fallback ?? initialsFromName(name)}
      </AvatarFallback>
    </Avatar>
  );
}
