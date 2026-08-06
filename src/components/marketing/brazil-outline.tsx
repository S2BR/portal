"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Brazil's silhouette (simplified from a public GeoJSON outline, ~200 points) drawn as a single
 * stroked path with the brand green gradient flowing along it; it draws itself once on load.
 * A brighter highlight "runner" moves around the outline continuously, and is faded in/out at
 * random moments — so each pass appears and disappears mid-motion, at a random position.
 * Decorative, so it's aria-hidden.
 */
const BRAZIL_PATH =
  "M 406.5 909 L 439.6 874 467.7 849.1 484.3 838.7 505.3 824.5 505.8 804.1 493.3 789.3 481 794.2 485.9 779.4 489.2 764.2 489.3 750.2 480.3 745.5 471 749.6 461.7 748.5 458.8 738.6 456.5 715.2 451.9 707.5 435.1 700.6 425 705.6 398.7 700.7 400.4 665.9 393 651.6 400.8 646.3 398.4 631.7 405.2 620.5 409.6 600.3 403.8 584.3 390.2 577.1 387.5 567 391.2 552.2 343.5 551.2 334 521.3 341.2 520.9 340.9 509.8 336.1 502.4 335 487.5 320.5 479.9 304.9 480.2 294.6 472.7 277.8 467.7 268.1 458.1 240.2 453.9 213.3 430.9 215.3 413.7 212.2 403.9 214.9 384.7 182.4 389 169.3 398.6 147.5 409 142 416.8 129.2 417.3 110.7 415.2 96.7 419.6 85.4 416.6 87.1 377.7 66.7 392.8 44.8 392.1 35.4 378.5 18.9 377 24.1 366 10.3 350.4 0 327.3 6.6 322.6 6.5 311.8 21.5 304.4 19.1 290.5 25.4 281.6 27.2 269.6 55.6 252.2 76 247.3 79.3 243.4 101.7 244.6 112.9 174.3 113.4 163.2 109.6 148.5 98.5 139.2 98.7 120.6 112.7 116.3 117.6 119 118.5 109.2 103.9 106.5 103.6 90.5 152 91 160.2 82.2 167.1 90.3 172 105.5 176.7 102.3 190.3 115.9 209.6 114.2 214.5 106.4 232.9 100.4 243.2 96.2 246 85.3 263.8 78 262.4 72.6 241.4 70.4 238 54.3 239 37.1 227.8 30.5 232.5 28.1 250.9 31.4 270.6 37.8 277.8 31.7 295.7 27.7 323.5 18.1 332.5 8.4 329.3 1.1 342.2 0 348 5.9 344.7 17.2 353.3 21 359 33 352.1 42 348.1 63.8 354.5 76.8 356.3 88.6 371.6 100.7 383.7 101.9 386.5 96.9 394.3 95.8 405.6 91.3 413.7 84.5 427.4 86.7 433.4 85.7 447 87.8 449.2 82.6 445 77.5 447.5 70.1 457.5 72.4 469.3 69.7 483.5 75.2 494.3 80.5 502 73.5 507.6 74.6 511 81.8 522.9 80 532.4 70.2 540 51.4 554.7 27.9 563.2 26.7 569.3 40.9 583.3 85.7 596.5 89.9 597.2 107.6 578.5 128.7 586.3 136.4 630.2 140.5 631.1 166.2 649.9 149.3 681.2 158.6 722.5 174.2 734.6 189.2 730.5 203.4 759.4 195.5 807.7 209.1 844.9 208.1 881.6 229.3 913.3 258 932.4 265.4 953.7 266.4 962.7 274.5 971.1 307.1 975.3 322.7 965.4 365 952.7 381.8 917.7 417.4 901.9 446.4 883.5 468.6 877.3 469.1 870.3 488 872.1 536 865.2 575.5 862.5 592.4 854.7 602.5 850.3 636.8 825.1 670.3 820.9 696.7 800.8 707.8 794.9 723.2 767.9 723.2 728.9 733 711.4 744.4 683.5 751.9 654.3 772.3 633.3 797.7 629.7 816.9 633.8 831 629.2 856.9 623.5 869.4 606.2 883.5 578.6 928.6 556.7 949 539.9 961 528.5 985.3 512.1 1000 505.2 985.5 516.2 973.3 501.8 955.9 482.3 941.7 456.7 925.3 447.5 926 422.6 906.2 406.5 909 Z";

export function BrazilOutline({ className }: { className?: string }) {
  const runner = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = runner.current;
    if (!el) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let hideTimer: ReturnType<typeof setTimeout>;
    let nextTimer: ReturnType<typeof setTimeout>;

    // One sweep: jump to a RANDOM start position (no transition), then glide a short distance from
    // there, fading in then out — all while moving. Picking a fresh random start each pass (rather
    // than sampling a continuously-running loop) is what keeps passes from clustering.
    const pass = () => {
      const start = Math.random();
      const distance = 0.28 + Math.random() * 0.14;
      const moveSeconds = 1.6 + Math.random() * 0.9;
      const fadeSeconds = 0.4;

      el.style.transition = "none";
      el.style.opacity = "0";
      el.style.strokeDashoffset = String(-start);
      void el.getBoundingClientRect(); // flush the reset before animating
      el.style.transition = `stroke-dashoffset ${moveSeconds}s linear, opacity ${fadeSeconds}s ease`;
      el.style.strokeDashoffset = String(-start - distance);
      el.style.opacity = "1";

      hideTimer = setTimeout(
        () => {
          el.style.opacity = "0";
        },
        (moveSeconds - fadeSeconds) * 1000,
      );
      nextTimer = setTimeout(
        pass,
        moveSeconds * 1000 + 1500 + Math.random() * 4000, // random gap before the next
      );
    };

    const first = setTimeout(pass, 4200); // first pass once the outline has drawn itself

    return () => {
      clearTimeout(first);
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, []);

  return (
    <svg
      viewBox="0 0 975.3 1000"
      aria-hidden
      className={cn("brazil-outline h-auto w-full", className)}
    >
      <defs>
        {/*
         * userSpaceOnUse + animating x1/x2 (rather than animateTransform on gradientTransform,
         * which WebKit/Safari doesn't animate) flows the gradient along the outline, matching the
         * launch-date glow. The tile is 500 units wide; shifting x1/x2 by one full tile loops
         * seamlessly (first and last stop are the same color).
         */}
        <linearGradient
          id="brazil-stroke"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="500"
          y2="0"
          spreadMethod="repeat"
        >
          <stop offset="0" stopColor="#3ae08f" />
          <stop offset="0.5" stopColor="#079f47" />
          <stop offset="1" stopColor="#3ae08f" />
          <animate
            attributeName="x1"
            from="0"
            to="500"
            dur="6s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="x2"
            from="500"
            to="1000"
            dur="6s"
            repeatCount="indefinite"
          />
        </linearGradient>
      </defs>
      <path
        className="brazil-line"
        d={BRAZIL_PATH}
        pathLength={1}
        fill="none"
        stroke="url(#brazil-stroke)"
        strokeWidth={5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* A brighter highlight that sweeps around the outline; JS fades it in at random moments. */}
      <path
        ref={runner}
        className="brazil-runner"
        d={BRAZIL_PATH}
        pathLength={1}
        fill="none"
        stroke="#c9ffdf"
        strokeWidth={5}
        strokeLinecap="round"
      />
    </svg>
  );
}
