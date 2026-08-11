"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A link that reveals a live screenshot of its destination on hover — a floating card that rises
 * above the link and drifts horizontally to follow the cursor (à la Aceternity's Link Preview). The
 * screenshot is rendered on demand by microlink.io (`api.microlink.io`), so no image is stored and
 * nothing is configured server-side; a plain `<img>` keeps it out of Next's remote-image allowlist.
 *
 * The link itself always opens in a new tab. On touch/reduced-motion the card simply doesn't animate
 * in — the link still works.
 */
export function LinkPreview({
  url,
  children,
  className,
  width = 200,
  height = 125,
}: {
  url: string;
  children: ReactNode;
  className?: string;
  width?: number;
  height?: number;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  // Drift the card toward the side of the link the pointer is on, softened by a spring.
  const x = useMotionValue(0);
  const translateX = useSpring(x, { stiffness: 100, damping: 15 });

  // microlink renders the screenshot and `embed=screenshot.url` makes the endpoint resolve straight
  // to the image, so it can be used as a plain `<img src>`. Oversample (×3) for a crisp thumbnail.
  const params = new URLSearchParams({
    url: /^https?:\/\//i.test(url) ? url : `https://${url}`,
    screenshot: "true",
    meta: "false",
    embed: "screenshot.url",
    "viewport.isMobile": "true",
    "viewport.deviceScaleFactor": "1",
    "viewport.width": String(width * 3),
    "viewport.height": String(height * 3),
  });
  const src = `https://api.microlink.io/?${params.toString()}`;

  const handleMouseMove = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) / 2);
  };

  return (
    <span
      className="relative inline-flex min-w-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onMouseMove={handleMouseMove}
        className={className}
      >
        {children}
      </a>
      <AnimatePresence>
        {open && !reduce ? (
          <motion.span
            style={{ x: translateX }}
            initial={{ opacity: 0, y: 20, scale: 0.6 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { type: "spring", stiffness: 260, damping: 20 },
            }}
            exit={{ opacity: 0, y: 20, scale: 0.6 }}
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 block -translate-x-1/2"
          >
            <span className="bg-background block rounded-xl border p-1 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- external on-demand screenshot, intentionally not next/image */}
              <img
                src={src}
                alt=""
                width={width}
                height={height}
                // Explicit box + `maxWidth: none` so Preflight's `img { max-width: 100% }` can't
                // shrink it to the (narrow) link's width — the card must stay a fixed thumbnail.
                style={{ width, height, maxWidth: "none" }}
                className={cn("block rounded-lg object-cover")}
              />
            </span>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
