import Image from "next/image";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";
import { getAppConfig } from "@/lib/api/app-config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [config, params] = await Promise.all([getAppConfig(), searchParams]);
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
      </CardContent>
    </Card>
  );
}
