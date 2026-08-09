import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CreateBusinessForm } from "@/components/business/create-business-form";

export async function generateMetadata(): Promise<Metadata> {
  const create = await getTranslations("create");
  return { title: create("business.title") };
}

/**
 * Create-a-business page (under the /portal panel). The minimal first version — name + type —
 * mirroring the API's create contract; details (address, hours, description) are added later
 * through editing.
 */
export default async function NewBusinessPage() {
  const [create, t] = await Promise.all([
    getTranslations("create"),
    getTranslations("businessNew"),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {create("business.title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CreateBusinessForm />
    </div>
  );
}
