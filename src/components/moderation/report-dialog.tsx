"use client";

import { Check, ChevronsUpDown, Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { REPORT_REASONS } from "@/lib/report-reasons";
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
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Report any reportable resource. Renders a subtle trigger + a popup where the reporter picks a
 * trust-and-safety category and adds optional context. Signed-in only — the trigger prompts sign-in
 * otherwise. Self-contained (renders its own trigger) so it works from server or client parents.
 * Posts to the generic `/api/reports` BFF.
 */
export function ReportDialog({
  type,
  id,
  label,
  className,
}: {
  type: string;
  id: string;
  /** Trigger text; defaults to the shared "Report" label. */
  label?: string;
  /** Extra classes for the trigger. */
  className?: string;
}) {
  const t = useTranslations("moderation.report");
  const reasons = useTranslations("moderation.reasons");
  const { user } = useCurrentUser();

  const [open, setOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  function launch() {
    if (!user) {
      toast.error(t("signInPrompt"));
      return;
    }
    setOpen(true);
  }

  async function submit() {
    if (!reason) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          id,
          reason,
          details: details.trim() || null,
        }),
      });
      if (response.ok) {
        toast.success(t("success"));
        setOpen(false);
        setReason("");
        setDetails("");
      } else {
        toast.error(t("error"));
      }
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
        className={cn(
          "text-muted-foreground hover:text-foreground text-xs underline underline-offset-2",
          className,
        )}
      >
        {label ?? t("trigger")}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] gap-5 overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <span
              aria-hidden
              className="bg-muted text-muted-foreground mb-1 flex size-10 items-center justify-center rounded-full"
            >
              <Flag className="size-5" />
            </span>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="report-reason">{t("reasonLabel")}</Label>
            <Popover open={reasonOpen} onOpenChange={setReasonOpen} modal>
              <PopoverTrigger asChild>
                <button
                  id="report-reason"
                  type="button"
                  className="border-input focus-visible:ring-ring dark:bg-input/30 bg-background flex h-11 w-full items-center justify-between gap-2 rounded-lg border px-3.5 text-base transition-colors outline-none focus-visible:ring-2"
                >
                  <span
                    className={cn(
                      "truncate",
                      !reason && "text-muted-foreground",
                    )}
                  >
                    {reason ? reasons(reason) : t("reasonPlaceholder")}
                  </span>
                  <ChevronsUpDown
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-(--radix-popover-trigger-width) p-0"
              >
                <Command>
                  <CommandInput placeholder={t("reasonSearchPlaceholder")} />
                  <CommandList>
                    <CommandEmpty>{t("reasonNoMatch")}</CommandEmpty>
                    {REPORT_REASONS.map((key) => (
                      <CommandItem
                        key={key}
                        value={reasons(key)}
                        onSelect={() => {
                          setReason(key);
                          setReasonOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "size-4",
                            reason === key ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {reasons(key)}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-details">{t("detailsLabel")}</Label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={t("detailsPlaceholder")}
              rows={3}
              maxLength={2000}
              disabled={busy}
            />
            <p className="text-muted-foreground text-right text-xs tabular-nums">
              {details.length}/2000
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={busy}>
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button type="button" onClick={submit} disabled={busy || !reason}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
