"use client";

import {
  AlertCircle,
  BadgeCheck,
  Check,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/current-user";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchUploadConfig,
  uploadPresignedObject,
  type UploadConfig,
} from "@/lib/uploads/upload";

type Proof = {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  key?: string;
};

/**
 * "Claim this business" — shown on an unclaimed public profile so the real owner can take ownership.
 * Self-contained (renders its own trigger) so it drops into the server-rendered profile like the
 * report dialog. A verified email match is granted instantly by the API (we route the new owner to
 * the editor); otherwise the claim + message + any proof documents are queued for operator review.
 * Signed-out visitors are sent to log in first.
 */
export function ClaimBusinessButton({
  businessId,
  isClaimed,
}: {
  businessId: string;
  isClaimed: boolean;
}) {
  const t = useTranslations("businessClaim");
  const { user } = useCurrentUser();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState<UploadConfig | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  // Load the claim-proof upload limits from the API (accepted types + file cap) the first time the
  // dialog opens — the source of truth, so nothing here is hardcoded.
  useEffect(() => {
    if (open && !config) {
      void fetchUploadConfig("claim-proof").then(setConfig);
    }
  }, [open, config]);

  const uploading = proofs.some((proof) => proof.status === "uploading");
  const maxFiles = config?.max_files ?? 0;
  const accept = config?.mime_types.join(",");

  if (isClaimed) {
    return null;
  }

  function launch() {
    if (!user) {
      toast.error(t("signInPrompt"));
      router.push("/login");
      return;
    }
    setOpen(true);
  }

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      setMessage("");
      setProofs([]);
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) {
      return;
    }
    const room = maxFiles - proofs.length;
    for (const file of Array.from(list).slice(0, Math.max(0, room))) {
      const id = String(++nextId.current);
      setProofs((current) => [
        ...current,
        { id, name: file.name, status: "uploading" },
      ]);
      void uploadPresignedObject("claim-proof", file, {
        context: { type: "business", id: businessId },
      }).then((result) => {
        // Size limit comes from the API (the presign response); the message names its value too.
        if (!result.ok && result.error === "size") {
          toast.error(
            t("proofTooLarge", {
              size: `${Math.round((config?.max_bytes ?? 0) / (1024 * 1024))} MB`,
            }),
          );
        }
        setProofs((current) =>
          current.map((proof) =>
            proof.id === id
              ? result.ok
                ? { ...proof, status: "done", key: result.key }
                : { ...proof, status: "error" }
              : proof,
          ),
        );
      });
    }
  }

  async function submit() {
    setBusy(true);
    try {
      const proof = proofs
        .filter((entry) => entry.status === "done" && entry.key)
        .map((entry) => entry.key as string);

      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "business",
          id: businessId,
          message: message.trim() || null,
          ...(proof.length > 0 ? { proof } : {}),
        }),
      });
      const data = (await response.json()) as {
        status?: string;
        claim?: { status?: string };
        message?: string;
      };

      if (data.status === "ok") {
        reset(false);
        if (data.claim?.status === "auto_approved") {
          toast.success(t("autoApproved"));
          router.push("/portal/businesses");
        } else {
          toast.success(t("submitted"));
        }
        router.refresh();
        return;
      }
      toast.error(data.message ?? t("error"));
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={launch}
        className="border-input hover:bg-accent focus-visible:ring-ring inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <BadgeCheck className="size-4" aria-hidden />
        {t("cta")}
      </button>

      <Dialog open={open} onOpenChange={reset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="claim-message">{t("messageLabel")}</Label>
            <Textarea
              id="claim-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={t("messagePlaceholder")}
              rows={4}
              maxLength={2000}
            />
            <p className="text-muted-foreground text-xs">{t("reviewNote")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("proofLabel")}</Label>
            <p className="text-muted-foreground text-xs">{t("proofHint")}</p>

            {proofs.length > 0 ? (
              <ul className="space-y-1.5">
                {proofs.map((proof) => (
                  <li
                    key={proof.id}
                    className="bg-muted/40 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                  >
                    {proof.status === "uploading" ? (
                      <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />
                    ) : proof.status === "error" ? (
                      <AlertCircle className="text-destructive size-4 shrink-0" />
                    ) : (
                      <Check className="text-brand-green size-4 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{proof.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setProofs((current) =>
                          current.filter((entry) => entry.id !== proof.id),
                        )
                      }
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      aria-label={t("proofRemove")}
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {proofs.length < maxFiles ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                <Paperclip className="size-4" />
                {t("proofAdd")}
              </Button>
            ) : null}
            <input
              ref={fileInput}
              type="file"
              accept={accept}
              multiple
              hidden
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={busy}>
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button onClick={submit} disabled={busy || uploading}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
