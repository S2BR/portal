import type { LucideIcon } from "lucide-react";

/** A centered placeholder for a company area that isn't built yet (Products, Services). */
export function ComingSoon({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
        <Icon className="size-6" />
      </span>
      <div className="space-y-1">
        <h1 className="font-heading text-lg font-semibold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm">{subtitle}</p>
      </div>
    </div>
  );
}
