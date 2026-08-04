import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getAppConfig } from "@/lib/api/app-config";

export default async function ForgotPasswordPage() {
  const [config, t] = await Promise.all([
    getAppConfig(),
    getTranslations("auth"),
  ]);

  return (
    <AuthShell>
      <ForgotPasswordForm passwordPolicy={config.password} />
      <p className="text-center text-sm">
        <Link
          href="/login"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          {t("login.back")}
        </Link>
      </p>
    </AuthShell>
  );
}
