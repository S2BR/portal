"use client";

import { useTranslations } from "next-intl";

import type { Business } from "@/app/api/businesses/route";
import { CreateBusinessForm } from "@/components/business/create-business-form";

/**
 * Operator create-a-business screen: the shared {@link CreateBusinessForm} pointed at the admin BFF
 * (`POST /api/admin/businesses`, which creates the listing unclaimed) and routed to the admin editor
 * on success. Owner assignment happens afterward from that editor.
 */
export function AdminCreateBusiness() {
  const t = useTranslations("admin.businesses.new");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </header>

      <CreateBusinessForm
        endpoint="/api/admin/businesses"
        redirectTo={(business: Business) =>
          `/portal/admin/businesses/${business.id}`
        }
      />
    </div>
  );
}
