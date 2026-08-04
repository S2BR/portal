import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [params, t] = await Promise.all([
    searchParams,
    getTranslations("auth"),
  ]);
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : "/";

  return (
    <AuthShell>
      <LoginForm nextPath={nextPath} />
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
    </AuthShell>
  );
}
