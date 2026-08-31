"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  defaultLocale,
  locales,
  localeNames,
  toApiLocale,
  type Locale,
} from "@/i18n/config";
import { cn } from "@/lib/utils";

import type {
  AdminPointRule,
  AdminPointRuleBody,
  AwardTiming,
} from "@/app/api/admin/point-rules/route";
import type { AdminTier } from "@/app/api/admin/tiers/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TIMINGS: AwardTiming[] = ["immediate", "on_approval"];

/**
 * The operator's "main area" for the points economy: retune each action's rule (points, on/off, timing,
 * caps), manage the tier ladder + perks, flip the master switch, and manually grant or claw back a
 * user's points. Everything here is data — no deploy moves the numbers.
 */
export function AdminGamification() {
  const t = useTranslations("admin.gamification");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </header>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">{t("tabs.rules")}</TabsTrigger>
          <TabsTrigger value="tiers">{t("tabs.tiers")}</TabsTrigger>
          <TabsTrigger value="settings">{t("tabs.settings")}</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-6">
          <RulesTab />
        </TabsContent>
        <TabsContent value="tiers" className="mt-6">
          <TiersTab />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RulesTab() {
  const t = useTranslations("admin.gamification");
  const [rules, setRules] = useState<AdminPointRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/point-rules");
      if (response.status === 403) {
        toast.error(t("forbidden"));
        return;
      }
      const data = (await response.json()) as { data: AdminPointRule[] };
      setRules(data.data ?? []);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const patch = (id: string, changes: Partial<AdminPointRule>) => {
    setRules((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, ...changes } : rule)),
    );
  };

  const save = async (rule: AdminPointRule) => {
    setSaving(rule.id);
    try {
      const body: AdminPointRuleBody = {
        points: rule.points,
        enabled: rule.enabled,
        award_timing: rule.award_timing,
        per_day_max: rule.per_day_max,
        once_per_target: rule.once_per_target,
        cooldown_seconds: rule.cooldown_seconds,
      };
      const response = await fetch(`/api/admin/point-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        toast.error(t("saveError"));
        return;
      }
      toast.success(t("saved"));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {rules.map((rule) => (
        <li key={rule.id} className="bg-muted/40 space-y-3 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="block font-medium">
                {t(`actions.${rule.action}`)}
              </span>
              <span className="text-muted-foreground text-xs">
                {rule.action}
              </span>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {t("rules.enabled")}
              </span>
              <Switch
                checked={rule.enabled}
                onCheckedChange={(value) => patch(rule.id, { enabled: value })}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("rules.points")}>
              <Input
                type="number"
                inputMode="numeric"
                value={String(rule.points)}
                onChange={(event) =>
                  patch(rule.id, { points: Number(event.target.value) || 0 })
                }
              />
            </Field>
            <Field label={t("rules.timing")}>
              <Select
                value={rule.award_timing}
                onValueChange={(value) =>
                  patch(rule.id, { award_timing: value as AwardTiming })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMINGS.map((timing) => (
                    <SelectItem key={timing} value={timing}>
                      {t(`timing.${timing}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("rules.perDay")}>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="—"
                value={
                  rule.per_day_max === null ? "" : String(rule.per_day_max)
                }
                onChange={(event) =>
                  patch(rule.id, {
                    per_day_max:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
            </Field>
            <Field label={t("rules.cooldown")}>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="—"
                value={
                  rule.cooldown_seconds === null
                    ? ""
                    : String(rule.cooldown_seconds)
                }
                onChange={(event) =>
                  patch(rule.id, {
                    cooldown_seconds:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
            </Field>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={rule.once_per_target}
                onCheckedChange={(value) =>
                  patch(rule.id, { once_per_target: value })
                }
              />
              <span className="text-muted-foreground">
                {t("rules.oncePerTarget")}
              </span>
            </label>
            <Button
              size="sm"
              onClick={() => save(rule)}
              disabled={saving !== null}
              className="gap-1.5"
            >
              {saving === rule.id ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t("rules.save")}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

type TierDraft = {
  id: string | null;
  key: string;
  /** Locale-keyed name map, keyed by API locale code (e.g. `pt_BR`). */
  name: Record<string, string>;
  min_points: string;
  perks: { key: string; value: string }[];
};

const DEFAULT_API_LOCALE = toApiLocale(defaultLocale);

/** Coerce a perk value the operator typed: "true"/"false" → boolean, numeric → number, else string. */
function coercePerk(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

function TiersTab() {
  const t = useTranslations("admin.gamification");
  const uiLocale = useLocale() as Locale;
  const [tiers, setTiers] = useState<AdminTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<TierDraft | null>(null);
  const [nameLocale, setNameLocale] = useState<Locale>(defaultLocale);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/tiers");
      if (response.status === 403) {
        toast.error(t("forbidden"));
        return;
      }
      const data = (await response.json()) as { data: AdminTier[] };
      setTiers(data.data ?? []);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const openNew = () => {
    setNameLocale(defaultLocale);
    setDraft({ id: null, key: "", name: {}, min_points: "0", perks: [] });
  };

  const openEdit = (tier: AdminTier) => {
    setNameLocale(uiLocale);
    setDraft({
      id: tier.id,
      key: tier.key,
      name: { ...tier.name_translations },
      min_points: String(tier.min_points),
      perks: Object.entries(tier.perks ?? {}).map(([key, value]) => ({
        key,
        value: String(value),
      })),
    });
  };

  // The default-locale name is required (the API's translate() fallback); Save gates on it.
  const nameReady = (draft?.name[DEFAULT_API_LOCALE] ?? "").trim() !== "";

  const save = async () => {
    if (draft === null || !nameReady) {
      return;
    }
    setSaving(true);
    try {
      const perks: Record<string, unknown> = {};
      for (const entry of draft.perks) {
        if (entry.key.trim() !== "") {
          perks[entry.key.trim()] = coercePerk(entry.value);
        }
      }
      // Trim + drop empty locales from the name map.
      const name: Record<string, string> = {};
      for (const [locale, value] of Object.entries(draft.name)) {
        if (value.trim() !== "") {
          name[locale] = value.trim();
        }
      }
      const isNew = draft.id === null;
      const body = isNew
        ? {
            key: draft.key.trim(),
            name,
            min_points: Number(draft.min_points) || 0,
            perks,
          }
        : {
            name,
            min_points: Number(draft.min_points) || 0,
            perks,
          };
      const response = await fetch(
        isNew ? "/api/admin/tiers" : `/api/admin/tiers/${draft.id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        toast.error(
          response.status === 422 ? t("tiers.invalid") : t("saveError"),
        );
        return;
      }
      toast.success(t("saved"));
      setDraft(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tier: AdminTier) => {
    const response = await fetch(`/api/admin/tiers/${tier.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error(t("saveError"));
      return;
    }
    setTiers((current) => current.filter((item) => item.id !== tier.id));
    toast.success(t("tiers.deleted"));
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} className="gap-1.5">
          <Plus className="size-4" aria-hidden />
          {t("tiers.new")}
        </Button>
      </div>

      <ul className="space-y-2">
        {tiers.map((tier) => (
          <li
            key={tier.id}
            className="bg-muted/40 flex items-center gap-3 rounded-xl p-4"
          >
            <div className="min-w-0 flex-1">
              <span className="block font-medium">{tier.name}</span>
              <span className="text-muted-foreground text-xs">
                {t("tiers.minPoints", { points: tier.min_points })}
              </span>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              {Object.keys(tier.perks ?? {}).map((perk) => (
                <Badge key={perk} variant="neutral" className="text-xs">
                  {perk}
                </Badge>
              ))}
            </div>
            <Button size="sm" variant="ghost" onClick={() => openEdit(tier)}>
              {t("tiers.edit")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => remove(tier)}
              aria-label={t("tiers.delete")}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>

      <Dialog
        open={draft !== null}
        onOpenChange={(open) => (open ? null : setDraft(null))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {draft?.id === null
                ? t("tiers.createTitle")
                : t("tiers.editTitle")}
            </DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              {draft.id === null ? (
                <Field label={t("tiers.key")} hint={t("tiers.keyHint")}>
                  <Input
                    value={draft.key}
                    onChange={(event) =>
                      setDraft({ ...draft, key: event.target.value })
                    }
                    placeholder="colaborador"
                  />
                </Field>
              ) : null}
              <Field label={t("tiers.name")}>
                {/* Per-locale name: a locale strip + the active locale's input. Dots mark filled ones. */}
                <div className="mb-2 flex flex-wrap gap-1">
                  {locales.map((locale) => {
                    const apiLocale = toApiLocale(locale);
                    const filled = (draft.name[apiLocale] ?? "").trim() !== "";
                    return (
                      <Button
                        key={locale}
                        type="button"
                        size="sm"
                        variant={nameLocale === locale ? "default" : "outline"}
                        className="gap-1.5"
                        onClick={() => setNameLocale(locale)}
                      >
                        {localeNames[locale]}
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            filled
                              ? "bg-brand-green"
                              : "bg-muted-foreground/40",
                          )}
                          aria-hidden
                        />
                      </Button>
                    );
                  })}
                </div>
                <Input
                  value={draft.name[toApiLocale(nameLocale)] ?? ""}
                  placeholder={
                    nameLocale === defaultLocale ? "" : t("tiers.nameFallback")
                  }
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      name: {
                        ...draft.name,
                        [toApiLocale(nameLocale)]: event.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label={t("tiers.minPointsLabel")}>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={draft.min_points}
                  onChange={(event) =>
                    setDraft({ ...draft, min_points: event.target.value })
                  }
                />
              </Field>

              <div className="space-y-2">
                <span className="text-sm font-medium">{t("tiers.perks")}</span>
                <p className="text-muted-foreground text-xs">
                  {t("tiers.perksHint")}
                </p>
                {draft.perks.map((perk, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={perk.key}
                      placeholder="content.auto_approve"
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          perks: draft.perks.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, key: event.target.value }
                              : entry,
                          ),
                        })
                      }
                    />
                    <Input
                      value={perk.value}
                      placeholder="true"
                      className="max-w-32"
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          perks: draft.perks.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, value: event.target.value }
                              : entry,
                          ),
                        })
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground shrink-0"
                      aria-label={t("tiers.removePerk")}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          perks: draft.perks.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      perks: [...draft.perks, { key: "", value: "" }],
                    })
                  }
                >
                  <Plus className="size-4" aria-hidden />
                  {t("tiers.addPerk")}
                </Button>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              {t("tiers.cancel")}
            </Button>
            <Button onClick={save} disabled={saving || !nameReady}>
              {t("tiers.saveTier")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsTab() {
  const t = useTranslations("admin.gamification");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [effective, setEffective] = useState(true);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/admin/gamification/settings");
      if (response.ok) {
        const data = (await response.json()) as {
          enabled: boolean | null;
          effective: boolean;
        };
        setEnabled(data.enabled);
        setEffective(data.effective);
      }
      setLoading(false);
    })();
  }, []);

  const setMaster = async (value: boolean | null) => {
    const previous = enabled;
    setEnabled(value);
    const response = await fetch("/api/admin/gamification/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: value }),
    });
    if (!response.ok) {
      setEnabled(previous);
      toast.error(t("saveError"));
      return;
    }
    const data = (await response.json()) as { effective: boolean };
    setEffective(data.effective);
    toast.success(t("saved"));
  };

  const adjust = async () => {
    if (userId.trim() === "" || amount.trim() === "" || reason.trim() === "") {
      return;
    }
    setAdjusting(true);
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(userId.trim())}/points/adjust`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            points: Number(amount),
            reason: reason.trim(),
          }),
        },
      );
      if (response.status === 404) {
        toast.error(t("settings.userNotFound"));
        return;
      }
      if (!response.ok) {
        toast.error(t("settings.adjustError"));
        return;
      }
      const data = (await response.json()) as { points: number };
      toast.success(t("settings.adjusted", { points: data.points }));
      setAmount("");
      setReason("");
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/40 space-y-3 rounded-xl p-4">
        <span className="block font-medium">{t("settings.masterSwitch")}</span>
        <p className="text-muted-foreground text-sm">
          {t("settings.masterHint")}
        </p>
        {loading ? (
          <Skeleton className="h-10 w-64" />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { value: null, label: t("settings.default") },
                { value: true, label: t("settings.on") },
                { value: false, label: t("settings.off") },
              ] as const
            ).map((option) => (
              <Button
                key={String(option.value)}
                size="sm"
                variant={enabled === option.value ? "default" : "outline"}
                onClick={() => setMaster(option.value)}
              >
                {option.label}
              </Button>
            ))}
            <span className="text-muted-foreground ml-2 text-sm">
              {t("settings.effective", {
                state: effective ? t("settings.on") : t("settings.off"),
              })}
            </span>
          </div>
        )}
      </div>

      <div className="bg-muted/40 space-y-3 rounded-xl p-4">
        <span className="block font-medium">{t("settings.adjustTitle")}</span>
        <p className="text-muted-foreground text-sm">
          {t("settings.adjustHint")}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("settings.userId")}>
            <Input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="gsyk754a"
            />
          </Field>
          <Field label={t("settings.amount")}>
            <Input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="-50"
            />
          </Field>
          <Field label={t("settings.reason")}>
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("settings.reasonPlaceholder")}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={adjust}
            disabled={
              adjusting ||
              userId.trim() === "" ||
              amount.trim() === "" ||
              reason.trim() === ""
            }
            className="gap-1.5"
          >
            {adjusting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t("settings.adjust")}
          </Button>
        </div>
      </div>
    </div>
  );
}
