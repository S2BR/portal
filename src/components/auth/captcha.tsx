"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { RecaptchaV2, RecaptchaV3 } from "@/components/auth/recaptcha";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CaptchaChallenge } from "@/lib/api/types";

/**
 * Loads a captcha challenge from the BFF for a flow and tracks the answer token.
 * The token the portal expects is `"<challenge_id>~<answer>"`. `refresh()`
 * issues a fresh challenge (challenges are single-use — a failed attempt burns
 * the current one).
 */
export function useCaptcha(
  context: "login" | "register" | "email_login" | "launch",
) {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setToken(null);
    try {
      const response = await fetch(`/api/auth/captcha?context=${context}`);
      setChallenge((await response.json()) as CaptchaChallenge);
    } catch {
      setChallenge({ required: false });
    }
  }, [context]);

  useEffect(() => {
    // Load the challenge on mount; setState only runs after the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  return { challenge, token, setToken, refresh };
}

/** Renders the active captcha widget for whichever driver the portal picked. */
export function Captcha({
  challenge,
  onToken,
}: {
  challenge: CaptchaChallenge | null;
  onToken: (token: string | null) => void;
}) {
  const t = useTranslations("auth");

  if (!challenge?.required || !challenge.challenge_id || !challenge.driver) {
    return null;
  }

  const challengeId = challenge.challenge_id;
  const siteKey = challenge.site_key;

  if (challenge.driver === "turnstile" && siteKey) {
    return (
      <div className="flex justify-center">
        <Turnstile
          key={challengeId}
          siteKey={siteKey}
          onSuccess={(token) => onToken(`${challengeId}~${token}`)}
          onError={() => onToken(null)}
          onExpire={() => onToken(null)}
          options={{ theme: "auto" }}
        />
      </div>
    );
  }

  if (challenge.driver === "hcaptcha" && siteKey) {
    return (
      <div className="flex justify-center">
        <HCaptcha
          key={challengeId}
          sitekey={siteKey}
          onVerify={(token) => onToken(`${challengeId}~${token}`)}
          onExpire={() => onToken(null)}
          onError={() => onToken(null)}
        />
      </div>
    );
  }

  if (challenge.driver === "recaptcha_v2" && siteKey) {
    return (
      <RecaptchaV2
        key={challengeId}
        siteKey={siteKey}
        challengeId={challengeId}
        onToken={onToken}
      />
    );
  }

  if (challenge.driver === "recaptcha_v3" && siteKey) {
    return (
      <RecaptchaV3
        key={challengeId}
        siteKey={siteKey}
        challengeId={challengeId}
        action={challenge.action ?? ""}
        onToken={onToken}
      />
    );
  }

  if (challenge.driver === "math") {
    return (
      <div className="space-y-2">
        <Label htmlFor="captcha-answer">{challenge.question}</Label>
        <Input
          id="captcha-answer"
          inputMode="numeric"
          autoComplete="off"
          onChange={(event) => {
            const value = event.target.value.trim();
            onToken(value ? `${challengeId}~${value}` : null);
          }}
        />
      </div>
    );
  }

  return (
    <p className="text-muted-foreground text-sm">{t("captchaUnsupported")}</p>
  );
}
