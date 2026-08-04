import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

/** The S2BR logo + wordmark, used in the app shell header. Links back to the dashboard. */
export function Brand() {
  const t = useTranslations("brand");
  return (
    <Link
      href="/"
      className="focus-visible:ring-ring/50 flex items-center gap-2 rounded-md focus-visible:ring-2 focus-visible:outline-none"
    >
      <Image
        src="/s2br.svg"
        alt="S2BR"
        width={48}
        height={48}
        priority
        unoptimized
        className="size-12 rounded-xl"
      />
      <span className="font-heading text-lg font-semibold tracking-tight">
        {t("name")}
      </span>
    </Link>
  );
}
