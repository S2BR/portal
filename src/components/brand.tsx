import Image from "next/image";
import Link from "next/link";

/** The S2BR logo, used in the app shell header. Links back to the dashboard. */
export function Brand() {
  return (
    <Link
      href="/"
      className="focus-visible:ring-ring/50 inline-flex rounded-md focus-visible:ring-2 focus-visible:outline-none"
    >
      <Image
        src="/s2br.svg"
        alt="S2BR"
        width={48}
        height={48}
        priority
        unoptimized
        className="size-12 rounded-md"
      />
    </Link>
  );
}
