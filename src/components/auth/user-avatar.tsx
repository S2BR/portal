import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/initials";

/**
 * A user's avatar: their picture when there is one, otherwise their initials. The initials
 * chip inverts with the theme (dark on light, light on dark) via `bg-foreground` /
 * `text-background`. Pass a size via `className` (defaults to the Avatar's size-8).
 */
export function UserAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback className="bg-foreground text-background text-xs font-semibold">
        {initialsFromName(name)}
      </AvatarFallback>
    </Avatar>
  );
}
