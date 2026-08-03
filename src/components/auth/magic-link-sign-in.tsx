"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorText } from "@/lib/api/error-text";

type State = "verifying" | "two_factor" | "error";

/**
 * Completes a magic-link sign-in. On mount it posts the signed link params to the verify
 * endpoint; a 2FA account gets a single-use pending token and we ask for the authenticator
 * code (in place, like the emailed-code flow). An invalid/expired/already-used link shows an
 * error with a way back to sign in.
 */
export function MagicLinkSignIn({
  email,
  token,
  expires,
  signature,
  nextPath,
}: {
  email: string;
  token: string;
  expires: number | null;
  signature: string | null;
  nextPath: string;
}) {
  const t = useTranslations("auth");
  const router = useRouter();

  const [state, setState] = useState<State>(
    email && token ? "verifying" : "error",
  );
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // The link is single-use — guard against React's double-invoke (dev) so it's never spent
    // twice. Missing params are already reflected in the initial state.
    if (started.current || !email || !token) {
      return;
    }
    started.current = true;

    void (async () => {
      try {
        const response = await fetch("/api/auth/login/email/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            token,
            ...(expires !== null ? { expires } : {}),
            ...(signature !== null ? { signature } : {}),
          }),
        });
        const data = (await response.json()) as {
          status?: string;
          pending_token?: string;
        };
        if (data.status === "authenticated") {
          router.replace(nextPath);
          router.refresh();
          return;
        }
        if (data.status === "two_factor_required" && data.pending_token) {
          setPendingToken(data.pending_token);
          setState("two_factor");
          return;
        }
        setState("error");
      } catch {
        setState("error");
      }
    })();
  }, [email, token, expires, signature, nextPath, router]);

  async function submitTwoFactor(event: FormEvent) {
    event.preventDefault();
    if (!twoFactorCode.trim()) {
      setError(t("errors.code"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login/email/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pending_token: pendingToken,
          two_factor_code: twoFactorCode.trim(),
        }),
      });
      const data = (await response.json()) as {
        status?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (data.status === "authenticated") {
        router.replace(nextPath);
        router.refresh();
        return;
      }
      if (data.status === "rate_limited") {
        setError(t("errors.rateLimited"));
        return;
      }
      setError(apiErrorText(data) ?? t("errors.generic"));
    } catch {
      setError(t("errors.generic"));
    } finally {
      setPending(false);
    }
  }

  if (state === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div
          className="border-muted-foreground/30 border-t-foreground size-6 animate-spin rounded-full border-2"
          aria-hidden
        />
        <p className="text-muted-foreground text-sm">
          {t("magicLink.verifying")}
        </p>
      </div>
    );
  }

  if (state === "two_factor") {
    return (
      <form onSubmit={submitTwoFactor} className="flex flex-col gap-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("emailCode.twoFactorTitle")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("emailCode.twoFactorSubtitle")}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="magic-2fa">{t("emailCode.twoFactorLabel")}</Label>
          <Input
            id="magic-2fa"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={twoFactorCode}
            onChange={(event) => setTwoFactorCode(event.target.value)}
            disabled={pending}
          />
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {t("emailCode.verifyButton")}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-center">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("magicLink.invalidTitle")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("magicLink.invalidSubtitle")}
        </p>
      </div>
      <Button asChild>
        <Link href="/login">{t("magicLink.backToLogin")}</Link>
      </Button>
    </div>
  );
}
