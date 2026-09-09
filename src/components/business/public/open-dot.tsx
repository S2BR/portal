import { cn } from "@/lib/utils";

/**
 * The "open now" indicator — a solid green dot with a soft pinging halo, the classic "live" pulse.
 * The halo is hidden under `prefers-reduced-motion`, leaving a plain dot. Decorative (the surrounding
 * label carries the meaning), so it's `aria-hidden`.
 */
export function OpenDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("relative flex size-2 shrink-0", className)}
      aria-hidden
    >
      <span className="bg-brand-green absolute inline-flex h-full w-full [animation:open-dot-ping_3s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full motion-reduce:hidden" />
      <span className="bg-brand-green relative inline-flex size-2 rounded-full" />
    </span>
  );
}
