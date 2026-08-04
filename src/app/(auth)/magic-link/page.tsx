import { AuthShell } from "@/components/auth/auth-shell";
import { MagicLinkSignIn } from "@/components/auth/magic-link-sign-in";

/**
 * Landing page for a magic sign-in link. The API emails a link here with the signed
 * `?email=&token=&expires=&signature=`; the client component completes the sign-in.
 */
export default async function MagicLinkPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
    token?: string;
    expires?: string;
    signature?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : "/";
  const expires =
    typeof params.expires === "string" && /^\d+$/.test(params.expires)
      ? Number(params.expires)
      : null;

  return (
    <AuthShell>
      <MagicLinkSignIn
        email={typeof params.email === "string" ? params.email : ""}
        token={typeof params.token === "string" ? params.token : ""}
        expires={expires}
        signature={
          typeof params.signature === "string" ? params.signature : null
        }
        nextPath={nextPath}
      />
    </AuthShell>
  );
}
