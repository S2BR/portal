import Image from "next/image";
import { redirect } from "next/navigation";

import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { Card, CardContent } from "@/components/ui/card";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  if (!email) {
    redirect("/register");
  }

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
        <VerifyEmailForm email={email} />
      </CardContent>
    </Card>
  );
}
