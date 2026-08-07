"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiErrorText } from "@/lib/api/error-text";
import { enterApp } from "@/lib/auth/enter-app";
import {
  browserSupportsWebAuthn,
  getPasskeyAssertion,
  isPasskeyCancellation,
} from "@/lib/auth/passkeys";
import { useAppConfig } from "@/lib/config/use-app-config";

/**
 * "Sign in with a passkey" — a usernameless flow: fetch request options, run the
 * browser ceremony, then verify. Renders nothing unless the portal has passkeys
 * enabled and the browser supports WebAuthn, so it never dead-ends the user.
 */
export function PasskeySignInButton({
  nextPath,
  disabled,
}: {
  nextPath: string;
  disabled?: boolean;
}) {
  const t = useTranslations("auth");
  const config = useAppConfig();
  const [supported, setSupported] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Client-only capability check — it can't run during SSR (no `window`).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(browserSupportsWebAuthn());
  }, []);

  if (!config?.passkeys?.enabled || !supported) {
    return null;
  }

  async function signIn() {
    setPending(true);
    setError(null);
    try {
      const optionsResponse = await fetch("/api/auth/passkeys/login/options", {
        method: "POST",
      });
      const optionsData = (await optionsResponse.json()) as {
        challenge_id?: string;
        options?: Parameters<typeof getPasskeyAssertion>[0];
      };
      if (
        !optionsResponse.ok ||
        !optionsData.options ||
        !optionsData.challenge_id
      ) {
        setError(t("errors.generic"));
        return;
      }

      const credential = await getPasskeyAssertion(optionsData.options);

      const verifyResponse = await fetch("/api/auth/passkeys/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: optionsData.challenge_id,
          credential,
        }),
      });
      const verifyData = (await verifyResponse.json()) as {
        status?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (verifyData.status === "authenticated") {
        enterApp(nextPath);
      } else if (verifyData.status === "rate_limited") {
        setError(t("errors.rateLimited"));
      } else {
        setError(apiErrorText(verifyData) ?? t("passkey.signInError"));
      }
    } catch (caught) {
      // A dismissed or timed-out prompt is not an error worth surfacing.
      if (!isPasskeyCancellation(caught)) {
        setError(t("passkey.signInError"));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3" aria-hidden>
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs tracking-wide uppercase">
          {t("passkey.or")}
        </span>
        <span className="bg-border h-px flex-1" />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={signIn}
        disabled={pending || disabled}
      >
        {t("passkey.signIn")}
      </Button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
