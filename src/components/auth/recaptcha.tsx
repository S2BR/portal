"use client";

import { useEffect, useRef } from "react";

/** Minimal shape of the global `grecaptcha` we use. */
interface Grecaptcha {
  ready: (callback: () => void) => void;
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => number;
  execute: (sitekey: string, options: { action: string }) => Promise<string>;
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

const scriptCache = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const existing = scriptCache.get(src);
  if (existing) {
    return existing;
  }
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
  scriptCache.set(src, promise);
  return promise;
}

interface RecaptchaProps {
  siteKey: string;
  challengeId: string;
  onToken: (token: string | null) => void;
}

/**
 * Google reCAPTCHA v2 — the "I'm not a robot" checkbox. Integrated directly
 * (the maintained React wrappers use `findDOMNode`, removed in React 19).
 */
export function RecaptchaV2({ siteKey, challengeId, onToken }: RecaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadScript("https://www.google.com/recaptcha/api.js?render=explicit")
      .then(() => {
        window.grecaptcha?.ready(() => {
          if (cancelled || renderedRef.current || !containerRef.current) {
            return;
          }
          renderedRef.current = true;
          window.grecaptcha?.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token) => onToken(`${challengeId}~${token}`),
            "expired-callback": () => onToken(null),
            "error-callback": () => onToken(null),
          });
        });
      })
      .catch(() => onToken(null));
    return () => {
      cancelled = true;
    };
  }, [siteKey, challengeId, onToken]);

  return <div ref={containerRef} className="flex justify-center" />;
}

/**
 * Google reCAPTCHA v3 — invisible + score-based. Executes for the portal's
 * expected action on mount and hands back the resulting token.
 */
export function RecaptchaV3({
  siteKey,
  challengeId,
  action,
  onToken,
}: RecaptchaProps & { action: string }) {
  const executedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadScript(`https://www.google.com/recaptcha/api.js?render=${siteKey}`)
      .then(() => {
        window.grecaptcha?.ready(() => {
          if (cancelled || executedRef.current) {
            return;
          }
          executedRef.current = true;
          window.grecaptcha
            ?.execute(siteKey, { action: action || "submit" })
            .then((token) => {
              if (!cancelled) {
                onToken(`${challengeId}~${token}`);
              }
            })
            .catch(() => onToken(null));
        });
      })
      .catch(() => onToken(null));
    return () => {
      cancelled = true;
    };
  }, [siteKey, challengeId, action, onToken]);

  return null;
}
