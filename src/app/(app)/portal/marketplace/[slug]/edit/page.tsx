import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { EditAdScreen } from "@/components/marketplace/edit-ad-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketplace");
  return { title: t("edit.title") };
}

/** Edit one of the owner's ads (details + photos). */
export default async function EditAdPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("marketplace");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("edit.title")}
        </h1>
        <p className="text-muted-foreground">{t("edit.subtitle")}</p>
      </div>
      <EditAdScreen slug={slug} />
    </div>
  );
}
