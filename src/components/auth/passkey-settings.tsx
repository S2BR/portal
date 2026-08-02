"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  browserSupportsWebAuthn,
  createPasskeyCredential,
  isPasskeyCancellation,
  type PasskeySummary,
} from "@/lib/auth/passkeys";
import { useAppConfig } from "@/lib/config/use-app-config";

type Mode = "idle" | "adding" | "removing";

/**
 * Passkey management on the profile: list the account's passkeys, add one (name
 * + password re-auth, then the browser ceremony), and remove one (password
 * re-auth). Adding and removing are password-gated at the portal — a stolen
 * token alone must not be able to plant or strip a credential.
 */
export function PasskeySettings() {
  const t = useTranslations("passkeys");
  const fields = useTranslations("auth.fields");
  const authErrors = useTranslations("auth.errors");
  const config = useAppConfig();
  const format = useFormatter();

  const [supported, setSupported] = useState(true);
  const [passkeys, setPasskeys] = useState<PasskeySummary[] | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
    setPassword("");
    setRemovingId(null);
    setError(null);
  }

  async function addPasskey(event: FormEvent) {
    event.preventDefault();
    if (!password) {
      setError(authErrors("password"));
      return;
    }
    setPending(true);
    setError(null);
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
        setError(authErrors("generic"));
        return;
      }

      const credential = await createPasskeyCredential(optionsData.options);

      const storeResponse = await fetch("/api/auth/passkeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || t("defaultName"),
          password,
          challenge_id: optionsData.challenge_id,
          credential,
        }),
      });
      const storeData = (await storeResponse.json()) as {
        status?: string;
        message?: string;
      };

      if (storeData.status === "ok") {
        reset();
        await load();
      } else {
        setError(storeData.message ?? authErrors("generic"));
      }
    } catch (caught) {
      if (!isPasskeyCancellation(caught)) {
        setError(t("addError"));
      }
    } finally {
      setPending(false);
    }
  }

  async function removePasskey(event: FormEvent) {
    event.preventDefault();
    if (removingId === null) {
      return;
    }
    if (!password) {
      setError(authErrors("password"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/passkeys/${removingId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await response.json()) as {
        status?: string;
        message?: string;
      };

      if (data.status === "ok") {
        reset();
        await load();
      } else {
        setError(data.message ?? authErrors("generic"));
      }
    } catch {
      setError(authErrors("generic"));
    } finally {
      setPending(false);
    }
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
        ) : mode === "removing" ? (
          <form onSubmit={removePasskey} className="space-y-4">
            <p className="text-sm">{t("removePrompt")}</p>
            <div className="space-y-2">
              <Label htmlFor="passkey-remove-password">
                {fields("password")}
              </Label>
              <Input
                id="passkey-remove-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" disabled={pending}>
                {t("remove")}
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : mode === "adding" ? (
          <form onSubmit={addPasskey} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="passkey-password">{fields("password")}</Label>
              <Input
                id="passkey-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {t("add")}
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {passkeys === null ? (
              <div
                className="bg-muted h-10 w-full animate-pulse rounded-md"
                aria-hidden
              />
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
                        setPassword("");
                        setError(null);
                        setMode("removing");
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
                setPassword("");
                setError(null);
                setMode("adding");
              }}
            >
              {t("add")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
