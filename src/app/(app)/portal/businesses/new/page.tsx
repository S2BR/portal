import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const create = await getTranslations("create");
  return { title: create("business.title") };
}

/**
 * Create-a-business page (under the /portal panel). Placeholder for now — the form + API wiring
 * land next per the owner's design instructions.
 */
export default async function NewBusinessPage() {
  const [create, t] = await Promise.all([
    getTranslations("create"),
    getTranslations("businessNew"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        {create("business.title")}
      </h1>
      <p className="text-muted-foreground">{t("comingSoon")}</p>
    </div>
  );
}
