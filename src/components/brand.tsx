import Image from "next/image";
import { useTranslations } from "next-intl";

/** The S2BR logo + wordmark, used in the app shell header. */
export function Brand() {
  const t = useTranslations("brand");
  return (
    <span className="flex items-center gap-2">
      <Image
        src="/s2br.svg"
        alt="S2BR"
        width={28}
        height={28}
        priority
        unoptimized
        className="rounded-md"
      />
      <span className="text-sm font-semibold tracking-tight">{t("name")}</span>
    </span>
  );
}
