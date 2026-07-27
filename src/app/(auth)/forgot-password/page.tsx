import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card, CardContent } from "@/components/ui/card";
import { getAppConfig } from "@/lib/api/app-config";

export default async function ForgotPasswordPage() {
  const [config, t] = await Promise.all([
    getAppConfig(),
    getTranslations("auth"),
  ]);

  return (
    <Card className="w-full max-w-sm">
      <CardContent className="flex flex-col gap-6 py-8">
        <div className="flex justify-center">
          <Image
            src="/s2br.svg"
            alt="S2BR"
            width={56}
            height={56}
            priority
            unoptimized
            className="rounded-xl"
          />
        </div>
        <ForgotPasswordForm passwordPolicy={config.password} />
        <p className="text-center text-sm">
          <Link
            href="/login"
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            {t("login.back")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
