/**
 * The default banner shown when a business has no banner image — a soft, abstract composition (muted
 * tonal blobs and a faint concentric-ring motif) over the parent's muted surface, so an empty banner
 * reads as designed rather than a flat gray block. Purely decorative and theme-aware: it paints in
 * `currentColor` (the foreground) at low opacity, so it's subtle in both light and dark. Uses no
 * pattern/filter ids, so it's safe to render many times on the directory grid.
 */
export function BusinessBannerPlaceholder() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <svg
        viewBox="0 0 320 120"
        preserveAspectRatio="xMidYMid slice"
        className="text-foreground absolute inset-0 size-full"
        fill="none"
      >
        <circle cx="34" cy="20" r="58" fill="currentColor" opacity="0.06" />
        <circle cx="120" cy="112" r="42" fill="currentColor" opacity="0.04" />
        <circle cx="292" cy="104" r="70" fill="currentColor" opacity="0.05" />
        <g stroke="currentColor" opacity="0.09">
          <circle cx="242" cy="26" r="16" vectorEffect="non-scaling-stroke" />
          <circle cx="242" cy="26" r="31" vectorEffect="non-scaling-stroke" />
          <circle cx="242" cy="26" r="46" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    </div>
  );
}
