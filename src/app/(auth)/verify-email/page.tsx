import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

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
    <AuthShell>
      <VerifyEmailForm email={email} />
    </AuthShell>
  );
}
