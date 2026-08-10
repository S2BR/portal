"use client";

import { KeyRound, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { VerifyDialog } from "@/components/auth/verify-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingBlock, SettingTile } from "@/components/ui/setting-tile";
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
        toast.success(t("addedToast"));
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
    const targetId = removingId;
    const response = await fetch(`/api/auth/passkeys/${targetId}`, {
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
      // The step-up dialog already gated this, so drop the row locally instead of refetching.
      setPasskeys(
        (prev) => prev?.filter((passkey) => passkey.id !== targetId) ?? prev,
      );
      reset();
      toast.success(t("removedToast"));
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
    <>
      {!supported ? (
        <SettingTile icon={KeyRound} label={t("title")}>
          <span className="text-muted-foreground text-sm font-normal">
            {t("unsupported")}
          </span>
        </SettingTile>
      ) : mode === "adding" ? (
        <SettingBlock icon={KeyRound} label={t("title")}>
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
        </SettingBlock>
      ) : (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">{t("title")}</h3>
            <p className="text-muted-foreground text-xs">{t("description")}</p>
          </div>
          {passkeys === null ? (
            <Skeleton className="h-16 w-full rounded-xl" />
          ) : passkeys.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          ) : (
            <div className="space-y-2">
              {passkeys.map((passkey) => (
                <SettingTile
                  key={passkey.id}
                  icon={KeyRound}
                  subtitle={
                    passkey.last_used_at
                      ? t("lastUsed", {
                          date: format.dateTime(new Date(passkey.last_used_at), {
                            dateStyle: "medium",
                          }),
                        })
                      : t("neverUsed")
                  }
                  action={
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
                  }
                >
                  {passkey.name}
                </SettingTile>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setName("");
              setMode("adding");
            }}
          >
            <Plus className="size-4" />
            {t("add")}
          </Button>
        </div>
      )}
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
    </>
  );
}
