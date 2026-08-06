"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Captcha, useCaptcha } from "@/components/auth/captcha";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * The landing "notify me at launch" call to action: a button that opens a dialog with a short
 * name + email form (bot-gated by the same captcha as the auth flows). On success the dialog
 * closes and a toast confirms — the signup goes into our own waitlist via the public
 * `/api/notify` BFF → API `/launch/subscribe`.
 */
export function NotifyForm() {
  const t = useTranslations("marketing.notify");
  const locale = useLocale();
  const {
    challenge,
    token: captchaToken,
    setToken: setCaptchaToken,
    refresh: refreshCaptcha,
  } = useCaptcha("launch");

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError(t("errors.name"));
      return;
    }
    if (!email.includes("@")) {
      setError(t("errors.email"));
      return;
    }
    if (challenge?.required && !captchaToken) {
      setError(t("errors.captcha"));
      return;
    }

    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email,
          locale,
          ...(challenge?.required && captchaToken
            ? { captcha_token: captchaToken }
            : {}),
        }),
      });

      if (response.ok) {
        setOpen(false);
        reset();
        toast.success(t("success"));
        return;
      }

      let message = t("errors.generic");
      try {
        const data = (await response.json()) as { status?: string };
        if (data.status === "rate_limited") {
          message = t("errors.rateLimited");
        } else if (data.status === "captcha_failed") {
          message = t("errors.captcha");
        }
      } catch {
        // Non-JSON body — keep the generic message.
      }
      setError(message);
      // The challenge is single-use — a failed attempt burns it, so re-issue one.
      void refreshCaptcha();
    } catch {
      setError(t("errors.generic"));
      void refreshCaptcha();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) {
          return;
        }
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg">{t("open")}</Button>
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="notify-name">{t("name")}</Label>
            <Input
              id="notify-name"
              name="name"
              autoComplete="name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notify-email">{t("email")}</Label>
            <Input
              id="notify-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={pending}
            />
          </div>

          <Captcha challenge={challenge} onToken={setCaptchaToken} />

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
