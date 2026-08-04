"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { VerifyDialog } from "@/components/auth/verify-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorText } from "@/lib/api/error-text";
import {
  browserSupportsWebAuthn,
  createPasskeyCredential,
  isPasskeyCancellation,
  type PasskeySummary,
} from "@/lib/auth/passkeys";
import { useAppConfig } from "@/lib/config/use-app-config";

type Mode = "idle" | "adding";
type PasswordAction = "add" | "remove";

/**
 * Passkey management on the profile: list the account's passkeys, add one (name,
 * then a password confirmation, then the browser ceremony), and remove one
 * (password confirmation). Adding and removing are password-gated at the portal —
 * a stolen token alone must not be able to plant or strip a credential. The
 * password itself is collected in the shared confirmation dialog.
 */
export function PasskeySettings() {
  const t = useTranslations("passkeys");
  const authErrors = useTranslations("auth.errors");
  const config = useAppConfig();
  const format = useFormatter();

  const [supported, setSupported] = useState(true);
  const [passkeys, setPasskeys] = useState<PasskeySummary[] | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [name, setName] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [passwordAction, setPasswordAction] = useState<PasswordAction | null>(
    null,
  );

  useEffect(() => {
    // Client-only capability check — it can't run during SSR (no `window`).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(browserSupportsWebAuthn());
  }, []);

  const load = useCallback(async () => {
    const response = await fetch("/api/auth/passkeys");
    if (response.ok) {
      const data = (await response.json()) as { passkeys?: PasskeySummary[] };
      setPasskeys(data.passkeys ?? []);
    }
  }, []);

  useEffect(() => {
    // Load the account's passkeys once on mount; setState runs after the fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (!config?.passkeys?.enabled) {
    return null;
  }

  function reset() {
    setMode("idle");
    setName("");
    setRemovingId(null);
  }

  function startAdd(event: FormEvent) {
    event.preventDefault();
    setPasswordAction("add");
  }

  // Runs from the verify dialog: with the token in hand, run the WebAuthn creation
  // ceremony, then store the credential. A user-cancelled ceremony closes quietly.
  async function addPasskey(token: string): Promise<string | null> {
    try {
      const optionsResponse = await fetch("/api/auth/passkeys/options", {
        method: "POST",
      });
      const optionsData = (await optionsResponse.json()) as {
        challenge_id?: string;
        options?: Parameters<typeof createPasskeyCredential>[0];
      };
      if (
        !optionsResponse.ok ||
        !optionsData.options ||
        !optionsData.challenge_id
      ) {
        return authErrors("generic");
      }

      const credential = await createPasskeyCredential(optionsData.options);

      const storeResponse = await fetch("/api/auth/passkeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || t("defaultName"),
          verification_token: token,
          challenge_id: optionsData.challenge_id,
          credential,
        }),
      });
      const storeData = (await storeResponse.json()) as {
        status?: string;
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (storeData.status === "ok") {
        reset();
        await load();
        return null;
      }
      return apiErrorText(storeData) ?? authErrors("generic");
    } catch (caught) {
      if (isPasskeyCancellation(caught)) {
        return null;
      }
      return t("addError");
    }
  }

  async function removePasskey(token: string): Promise<string | null> {
    if (removingId === null) {
      return null;
    }
    const response = await fetch(`/api/auth/passkeys/${removingId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verification_token: token }),
    });
    const data = (await response.json()) as {
      status?: string;
      message?: string;
      errors?: Record<string, string[]>;
    };
    if (data.status === "ok") {
      reset();
      await load();
      return null;
    }
    return apiErrorText(data) ?? authErrors("generic");
  }

  function confirmVerified(token: string): Promise<string | null> {
    if (passwordAction === "add") {
      return addPasskey(token);
    }
    if (passwordAction === "remove") {
      return removePasskey(token);
    }
    return Promise.resolve(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supported ? (
          <p className="text-muted-foreground text-sm">{t("unsupported")}</p>
        ) : mode === "adding" ? (
          <form onSubmit={startAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passkey-name">{t("nameLabel")}</Label>
              <Input
                id="passkey-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("namePlaceholder")}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">{t("add")}</Button>
              <Button type="button" variant="ghost" onClick={reset}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {passkeys === null ? (
              <Skeleton className="h-10 w-full" />
            ) : passkeys.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("empty")}</p>
            ) : (
              <ul className="divide-border divide-y rounded-md border">
                {passkeys.map((passkey) => (
                  <li
                    key={passkey.id}
                    className="flex items-center justify-between gap-4 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {passkey.name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {passkey.last_used_at
                          ? t("lastUsed", {
                              date: format.dateTime(
                                new Date(passkey.last_used_at),
                                { dateStyle: "medium" },
                              ),
                            })
                          : t("neverUsed")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRemovingId(passkey.id);
                        setPasswordAction("remove");
                      }}
                    >
                      {t("remove")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setName("");
                setMode("adding");
              }}
            >
              {t("add")}
            </Button>
          </div>
        )}
      </CardContent>
      <VerifyDialog
        open={passwordAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordAction(null);
            setRemovingId(null);
          }
        }}
        action={passwordAction === "remove" ? "passkey.remove" : "passkey.add"}
        params={
          passwordAction === "remove"
            ? { passkey_id: removingId !== null ? String(removingId) : "" }
            : { name: name.trim() || t("defaultName") }
        }
        onVerified={confirmVerified}
        description={
          passwordAction === "remove" ? t("removePrompt") : undefined
        }
        confirmLabel={passwordAction === "remove" ? t("remove") : t("add")}
        destructive={passwordAction === "remove"}
      />
    </Card>
  );
}
