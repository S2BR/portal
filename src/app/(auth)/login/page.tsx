import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";
import { getAppConfig } from "@/lib/api/app-config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [config, params, t] = await Promise.all([
    getAppConfig(),
    searchParams,
    getTranslations("auth"),
  ]);
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : "/";

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
        <LoginForm captchaRequired={config.captcha.login} nextPath={nextPath} />
        <div className="text-muted-foreground space-y-2 text-center text-sm">
          <p>
            <Link
              href="/forgot-password"
              className="underline-offset-4 hover:underline"
            >
              {t("links.forgotPassword")}
            </Link>
          </p>
          <p>
            {t("links.noAccount")}{" "}
            <Link
              href="/register"
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              {t("links.createAccount")}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
