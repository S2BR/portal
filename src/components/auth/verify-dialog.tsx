"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorText } from "@/lib/api/error-text";
import {
  getPasskeyAssertion,
  isPasskeyCancellation,
} from "@/lib/auth/passkeys";

type VerifyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The step-up action identifier, e.g. "email.change" — must match the API's StepUpAction. */
  action: string;
  /** The values the minted token is bound to; sent identically to the action endpoint. */
  params?: Record<string, unknown>;
  /**
   * Runs the gated action with the freshly minted verification token. Return an error
   * message to show inline (the dialog stays open for a retry), or `null` on success.
   */
  onVerified: (token: string) => Promise<string | null>;
  title?: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
};

/**
 * The single step-up prompt for every sensitive profile action. It proves identity — the
 * account password, or a passkey when the account has one — at /api/auth/verify, receives a
 * single-use token bound to this exact action and its params, then hands it to `onVerified`
 * to perform the action. A wrong password or failed action is shown inline without closing.
 */
export function VerifyDialog({
  open,
  onOpenChange,
  action,
  params,
  onVerified,
  title,
  description,
  confirmLabel,
  destructive = false,
}: VerifyDialogProps) {
  const t = useTranslations("verify");
  const fields = useTranslations("auth.fields");
  const authErrors = useTranslations("auth.errors");

  const [password, setPassword] = useState("");
  const [methods, setMethods] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/auth/verify/methods");
        const data = (await response.json()) as { methods?: string[] };
        if (active) {
          setMethods(data.methods ?? ["password"]);
        }
      } catch {
        if (active) {
          setMethods(["password"]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  function close() {
    setPassword("");
    setError(null);
    setMethods(null);
    onOpenChange(false);
  }

  // Exchange the minted token for the completed action; a returned message keeps us open.
  async function runAction(token: string) {
    const message = await onVerified(token);
    if (message) {
      setError(message);
      return;
    }
    close();
  }

  async function verifyWithPassword(event: FormEvent) {
    event.preventDefault();
    if (!password) {
      setError(authErrors("password"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "password",
          action,
          params: params ?? {},
          password,
        }),
      });
      const data = (await response.json()) as {
        verification_token?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (!response.ok || !data.verification_token) {
        setError(apiErrorText(data) ?? authErrors("generic"));
        return;
      }
      await runAction(data.verification_token);
    } catch {
      setError(authErrors("generic"));
    } finally {
      setPending(false);
    }
  }

  async function verifyWithPasskey() {
    setPending(true);
    setError(null);
    try {
      const optionsResponse = await fetch("/api/auth/verify/options", {
        method: "POST",
      });
      const optionsData = (await optionsResponse.json()) as {
        challenge_id?: string;
        options?: Parameters<typeof getPasskeyAssertion>[0];
      };
      if (
        !optionsResponse.ok ||
        !optionsData.challenge_id ||
        !optionsData.options
      ) {
        setError(authErrors("generic"));
        return;
      }

      const assertion = await getPasskeyAssertion(optionsData.options);

      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "passkey",
          action,
          params: params ?? {},
          challenge_id: optionsData.challenge_id,
          assertion,
        }),
      });
      const data = (await response.json()) as {
        verification_token?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };
      if (!response.ok || !data.verification_token) {
        setError(apiErrorText(data) ?? authErrors("generic"));
        return;
      }
      await runAction(data.verification_token);
    } catch (caught) {
      if (!isPasskeyCancellation(caught)) {
        setError(t("passkeyError"));
      }
    } finally {
      setPending(false);
    }
  }

  const passkeyAvailable = methods?.includes("passkey") ?? false;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) {
          close();
        }
      }}
    >
      <DialogContent showCloseButton={!pending}>
        <form onSubmit={verifyWithPassword} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title ?? t("title")}</DialogTitle>
            <DialogDescription>
              {description ?? t("description")}
            </DialogDescription>
          </DialogHeader>

          {passkeyAvailable ? (
            <div className="grid gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={verifyWithPasskey}
                disabled={pending}
              >
                {t("usePasskey")}
              </Button>
              <div className="flex items-center gap-3">
                <span className="bg-border h-px flex-1" />
                <span className="text-muted-foreground text-xs">{t("or")}</span>
                <span className="bg-border h-px flex-1" />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="verify-password">{fields("password")}</Label>
            <Input
              id="verify-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
            />
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={close}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              disabled={pending}
            >
              {confirmLabel ?? t("confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
