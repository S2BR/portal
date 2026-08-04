import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getAppConfig } from "@/lib/api/app-config";

export default async function RegisterPage() {
  const [config, t] = await Promise.all([
    getAppConfig(),
    getTranslations("auth"),
  ]);

  return (
    <AuthShell>
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
    </AuthShell>
  );
}
