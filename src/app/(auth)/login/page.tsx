import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";

export default async function LoginPage() {
  const t = await getTranslations("auth.signIn");

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <Image
          src="/s2br.svg"
          alt="S2BR"
          width={56}
          height={56}
          priority
          unoptimized
          className="rounded-xl"
        />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <p className="text-muted-foreground text-sm">{t("comingSoon")}</p>
      </CardContent>
    </Card>
  );
}
