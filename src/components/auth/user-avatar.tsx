import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/initials";
import { cn } from "@/lib/utils";

/**
 * A user's avatar: their picture when there is one, otherwise their initials. The initials
 * chip inverts with the theme (dark on light, light on dark) via `bg-foreground` /
 * `text-background`. Pass a size via `className` (defaults to the Avatar's size-8).
 */
export function UserAvatar({
  name,
  src,
  className,
  fallbackClassName,
}: {
  name: string;
  src?: string | null;
  className?: string;
  /** Override the initials chip (weight, size, colors). */
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback
        className={cn(
          // `text-background!` wins over a parent's `focus:**:text-accent-foreground`
          // (e.g. a DropdownMenuItem) so the initials stay readable on hover. `leading-none`
          // makes the uppercase initials sit optically centered (not slightly high).
          "bg-foreground text-background! text-xs leading-none font-extrabold select-none",
          fallbackClassName,
        )}
      >
        {initialsFromName(name)}
      </AvatarFallback>
    </Avatar>
  );
}
