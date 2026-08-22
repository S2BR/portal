import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A horizontal stack of {@link Avatar}s that overlap, each ringed in the page background so the
 * edges read cleanly. shadcn ships `avatar` but not an installable `avatar-group`, so this follows
 * the same convention: a thin layout wrapper you drop `Avatar` children into.
 */
function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "*:ring-background flex items-center -space-x-2 *:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export { AvatarGroup };
