"use client";

import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

/**
 * "Claim this business" — shown on an unclaimed public profile so the real owner can take ownership.
 * Self-contained (renders its own trigger) so it drops into the server-rendered profile like the
 * report dialog. A verified email match is granted instantly by the API (we route the new owner to
 * the editor); otherwise the claim + message is queued for operator review. Signed-out visitors are
 * sent to log in first.
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
  const [busy, setBusy] = useState(false);

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

  async function submit() {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(businessId)}/claim`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: message.trim() || null }),
        },
      );
      const data = (await response.json()) as {
        status?: string;
        claim?: { status?: string };
        message?: string;
      };

      if (data.status === "ok") {
        setOpen(false);
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

      <Dialog open={open} onOpenChange={setOpen}>
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

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={busy}>
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button onClick={submit} disabled={busy}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
