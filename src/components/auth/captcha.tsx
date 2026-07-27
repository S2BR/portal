"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CaptchaChallenge } from "@/lib/api/types";

/**
 * Loads a captcha challenge from the BFF for a flow and tracks the answer token.
 * The token the portal expects is `"<challenge_id>~<answer>"`. `refresh()`
 * issues a fresh challenge (challenges are single-use — a failed attempt burns
 * the current one).
 */
export function useCaptcha(context: "login" | "register") {
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

/** Renders the active captcha widget (Turnstile or a self-hosted math prompt). */
export function Captcha({
  challenge,
  onToken,
}: {
  challenge: CaptchaChallenge | null;
  onToken: (token: string | null) => void;
}) {
  const t = useTranslations("auth");

  if (!challenge?.required || !challenge.challenge_id) {
    return null;
  }

  const challengeId = challenge.challenge_id;

  if (challenge.driver === "turnstile" && challenge.site_key) {
    return (
      <div className="flex justify-center">
        <Turnstile
          key={challengeId}
          siteKey={challenge.site_key}
          onSuccess={(token) => onToken(`${challengeId}~${token}`)}
          onError={() => onToken(null)}
          onExpire={() => onToken(null)}
          options={{ theme: "auto" }}
        />
      </div>
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
