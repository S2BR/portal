import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AdminCreateBusiness } from "@/components/admin/admin-create-business";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.businesses.new");
  return { title: t("title") };
}

/**
 * Admin "create business" page (`/portal/admin/businesses/new`, under the gated admin panel). The
 * minimal name + type contract; the operator fills in the rest — and attaches an owner — from the
 * editor it lands on.
 */
export default function AdminNewBusinessPage() {
  return <AdminCreateBusiness />;
}
