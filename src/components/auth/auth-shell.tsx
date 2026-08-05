import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Wraps an auth screen's content in a consistent, centered column. Shows the S2BR mark on top
 * for small screens; on large screens the split-screen brand panel (in the auth layout) carries
 * the identity instead, so the mark is hidden. Each screen's form renders its own heading.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex justify-center lg:hidden">
        <Link href="/" aria-label="S2BR" className="inline-flex">
          <Image
            src="/s2br.svg"
            alt="S2BR"
            width={52}
            height={52}
            priority
            unoptimized
            className="rounded-xl"
          />
        </Link>
      </div>
      {children}
    </div>
  );
}
