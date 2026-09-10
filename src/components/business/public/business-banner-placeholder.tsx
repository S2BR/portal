/**
 * The default banner shown when a business has no banner image — a soft, abstract composition (muted
 * tonal blobs and a faint concentric-ring motif). Theme-aware: it paints in `currentColor` at low
 * opacity, so it's subtle in both light and dark. When `color` (the business's brand color) is given,
 * the shapes tint to it and a faint tonal wash sits behind — layered over the muted surface, so it
 * stays subtle in either theme. Uses no pattern/filter ids, so it's safe to render many times on the
 * directory grid.
 */
export function BusinessBannerPlaceholder({
  color,
}: {
  color?: string | null;
}) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {color ? (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, color-mix(in oklab, ${color} 16%, transparent), color-mix(in oklab, ${color} 4%, transparent))`,
          }}
        />
      ) : null}
      <svg
        viewBox="0 0 320 120"
        preserveAspectRatio="xMidYMid slice"
        className={
          color
            ? "absolute inset-0 size-full"
            : "text-foreground absolute inset-0 size-full"
        }
        style={color ? { color } : undefined}
        fill="none"
      >
        <circle cx="34" cy="20" r="58" fill="currentColor" opacity="0.08" />
        <circle cx="120" cy="112" r="42" fill="currentColor" opacity="0.05" />
        <circle cx="292" cy="104" r="70" fill="currentColor" opacity="0.06" />
        <g stroke="currentColor" opacity="0.11">
          <circle cx="242" cy="26" r="16" vectorEffect="non-scaling-stroke" />
          <circle cx="242" cy="26" r="31" vectorEffect="non-scaling-stroke" />
          <circle cx="242" cy="26" r="46" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    </div>
  );
}
