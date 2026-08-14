"use client";

import { ArrowRight, Check, Loader2, Rocket } from "lucide-react";
import { useTranslations } from "next-intl";

import type { BusinessReadiness } from "@/app/api/businesses/route";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Where each requirement is edited on the detail page — the tab to open and the section to scroll to.
 * The API owns *truth* (which requirements are met); the portal owns *presentation* (labels, hints,
 * and where to send the owner to fix each one). A key the API adds later that isn't mapped here simply
 * isn't linkable — it still shows in the checklist, just without a jump target.
 */
const DESTINATIONS: Record<string, { tab: string; section: string }> = {
  name: { tab: "general", section: "section-basics" },
  description: { tab: "general", section: "section-basics" },
  category: { tab: "general", section: "section-categories" },
  contactable: { tab: "contact", section: "section-website" },
};

/**
 * The go-live surface for a draft business — the deliberate, unmissable path from "done editing" to
 * "actually public". It reads the API's {@link BusinessReadiness} and shows one of three states:
 *
 * - **below the bar** → a checklist of what's still missing, each unmet item a shortcut to the field.
 * - **meets the bar** → a banner that names the consequence and a primary Publish button.
 * - **already published** → nothing (the header switch owns un-publishing); the panel's job is done.
 *
 * A switch alone reads as a setting you already configured; this makes going live a conscious action.
 */
export function PublishPanel({
  readiness,
  isPublished,
  publishing = false,
  onPublish,
  onNavigate,
}: {
  readiness: BusinessReadiness | undefined;
  isPublished: boolean;
  publishing?: boolean;
  onPublish: () => void;
  onNavigate: (tab: string, section: string) => void;
}) {
  const t = useTranslations("businesses.publish");

  // Published, or the readiness payload isn't present (e.g. a list response) — nothing to nudge.
  if (isPublished || !readiness) {
    return null;
  }

  if (readiness.is_publishable) {
    return (
      <div className="border-primary/30 bg-primary/5 flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Rocket className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">{t("readyTitle")}</p>
            <p className="text-muted-foreground max-w-prose text-sm text-pretty">
              {t("readyBody")}
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={onPublish}
          disabled={publishing}
          className="shrink-0 sm:self-center"
        >
          {publishing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Rocket className="size-4" />
          )}
          {t("cta")}
        </Button>
      </div>
    );
  }

  const total = readiness.requirements.length;
  const done = readiness.requirements.filter((requirement) => requirement.met)
    .length;

  return (
    <div className="bg-muted/40 space-y-4 rounded-2xl border p-5">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">{t("checklistTitle")}</p>
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {t("progress", { done, total })}
          </span>
        </div>
        <p className="text-muted-foreground text-sm text-pretty">
          {t("checklistBody")}
        </p>
      </div>

      <ul className="space-y-1.5">
        {readiness.requirements.map(({ key, met }) => {
          const destination = DESTINATIONS[key];
          const label = t(`requirements.${key}.label`);
          const hint = t(`requirements.${key}.hint`);

          if (met) {
            return (
              <li
                key={key}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              >
                <span className="bg-primary/15 text-primary flex size-5 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-3.5" />
                </span>
                <span className="text-muted-foreground text-sm line-through">
                  {label}
                </span>
              </li>
            );
          }

          const content = (
            <>
              <span className="border-muted-foreground/40 mt-0.5 size-5 shrink-0 rounded-full border-2 border-dashed" />
              <span className="min-w-0 space-y-0.5">
                <span className="block text-sm font-medium">{label}</span>
                <span className="text-muted-foreground block text-xs">
                  {hint}
                </span>
              </span>
            </>
          );

          if (!destination) {
            return (
              <li key={key} className="flex items-start gap-3 px-3 py-2.5">
                {content}
              </li>
            );
          }

          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onNavigate(destination.tab, destination.section)}
                className={cn(
                  "group hover:bg-background flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                )}
              >
                {content}
                <ArrowRight className="text-muted-foreground group-hover:text-foreground ml-auto size-4 shrink-0 self-center transition-colors" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
