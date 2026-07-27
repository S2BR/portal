import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent } from "@/components/ui/card";
import { getAppConfig } from "@/lib/api/app-config";

export default async function RegisterPage() {
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
        <RegisterForm passwordPolicy={config.password} />
        <p className="text-muted-foreground text-center text-sm">
          {t("links.haveAccount")}{" "}
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            {t("links.signIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
