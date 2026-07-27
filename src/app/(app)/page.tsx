import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("welcome")}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {/* Real dashboard content arrives with the feature work. */}
        </CardContent>
      </Card>
    </div>
  );
}
