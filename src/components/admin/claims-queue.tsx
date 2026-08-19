"use client";

import { ExternalLink } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type {
  AdminClaim,
  AdminClaimsPage,
} from "@/app/api/admin/business-claims/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const STATUSES = [
  "pending",
  "approved",
  "rejected",
  "auto_approved",
] as const;
const ALL = "all";

type BadgeVariant = "neutral" | "green" | "gold" | "red" | "outline";
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: "gold",
  approved: "green",
  auto_approved: "green",
  rejected: "red",
};

/**
 * The operator business-claims review queue: pending ownership claims first, filterable by status.
 * A row opens a detail panel with the claimant's message, the submitted proof images, and — for a
 * pending claim — the approve/reject actions with an optional internal note. The API enforces the
 * super_admin role.
 */
export function ClaimsQueue() {
  const t = useTranslations("admin.claims");
  const format = useFormatter();

  const [claims, setClaims] = useState<AdminClaim[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminClaim | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (status !== ALL) query.set("status", status);
    if (page > 1) query.set("page", String(page));
    try {
      const response = await fetch(
        `/api/admin/business-claims?${query.toString()}`,
      );
      if (response.status === 403) {
        toast.error(t("forbidden"));
        return;
      }
      const data = (await response.json()) as AdminClaimsPage;
      setClaims(data.data);
      setMeta(data.meta);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [status, page, t]);

  useEffect(() => {
    // Refetch on mount and whenever a filter/page changes; setState runs after the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function onFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  const formatDate = (value: string | null) =>
    value
      ? format.dateTime(new Date(value), {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <FilterSelect
          label={t("filters.status")}
          value={status}
          onChange={(value) => onFilter(setStatus, value)}
          allLabel={t("filters.allStatuses")}
          options={STATUSES.map((key) => ({
            value: key,
            label: t(`status.${key}`),
          }))}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : claims.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-2xl border p-10 text-center text-sm">
          {t("empty")}
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.business")}</TableHead>
                <TableHead>{t("table.claimant")}</TableHead>
                <TableHead>{t("table.method")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.submitted")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => (
                <TableRow
                  key={claim.id}
                  onClick={() => setSelected(claim)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <span className="block max-w-xs truncate font-medium">
                      {claim.business.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="block max-w-xs truncate">
                      {claim.claimant.name ?? claim.claimant.email ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {t(`method.${claim.method}`)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[claim.status] ?? "neutral"}>
                      {t(`status.${claim.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(claim.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {meta.last_page > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {t("pagination.page", {
              page: meta.current_page,
              total: meta.last_page,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || meta.current_page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t("pagination.previous")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || meta.current_page >= meta.last_page}
              onClick={() => setPage((current) => current + 1)}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      ) : null}

      <ClaimDetail
        key={selected?.id ?? "none"}
        claim={selected}
        t={t}
        formatDate={formatDate}
        onClose={() => setSelected(null)}
        onActioned={async () => {
          setSelected(null);
          await load();
        }}
      />
    </div>
  );
}

/**
 * The claim detail panel — everything about one ownership claim, plus the actions. A pending claim
 * can be approved or rejected; the note applies to whichever action is taken. A reviewed claim shows
 * its outcome read-only. Any successful action reloads the list.
 */
function ClaimDetail({
  claim,
  t,
  formatDate,
  onClose,
  onActioned,
}: {
  claim: AdminClaim | null;
  t: ReturnType<typeof useTranslations>;
  formatDate: (value: string | null) => string;
  onClose: () => void;
  onActioned: () => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (claim === null) {
    return null;
  }

  async function review(action: "approve" | "reject") {
    setBusy(true);
    const response = await fetch(
      `/api/admin/business-claims/${encodeURIComponent(claim!.id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || null }),
      },
    );
    setBusy(false);
    if (!response.ok) {
      toast.error(t(response.status === 403 ? "forbidden" : "actionError"));
      return;
    }
    toast.success(t(`toast.${action}`));
    await onActioned();
  }

  const isPending = claim.status === "pending";

  return (
    <Sheet open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-lg"
      >
        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_VARIANT[claim.status] ?? "neutral"}>
                {t(`status.${claim.status}`)}
              </Badge>
              <Badge variant="neutral">{t(`method.${claim.method}`)}</Badge>
            </div>
            <SheetTitle className="text-xl">{claim.business.name}</SheetTitle>
            <SheetDescription>
              {t("detail.claimant")}:{" "}
              {claim.claimant.name ?? claim.claimant.email ?? "—"} ·{" "}
              {formatDate(claim.created_at)}
            </SheetDescription>
          </div>

          {/* Business link */}
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/businesses/${encodeURIComponent(claim.business.slug)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" />
              {t("detail.viewPublic")}
            </Link>
          </Button>

          {/* Claimant, in full */}
          <Section title={t("detail.claimant")}>
            <p className="text-sm">{claim.claimant.name ?? "—"}</p>
            {claim.claimant.email ? (
              <p className="text-muted-foreground text-sm">
                {claim.claimant.email}
              </p>
            ) : null}
          </Section>

          {/* Claimant's free-text message */}
          <Section title={t("detail.message")}>
            {claim.message ? (
              <p className="text-sm whitespace-pre-wrap">{claim.message}</p>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                {t("detail.noMessage")}
              </p>
            )}
          </Section>

          {/* Submitted proof images */}
          <Section title={t("detail.proof")}>
            {claim.proof.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {claim.proof.map((url, index) => (
                  <Link
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={t("detail.proofAlt", { index: index + 1 })}
                      className="size-24 rounded-lg border object-cover"
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                {t("detail.noProof")}
              </p>
            )}
          </Section>

          {/* Review outcome, once reviewed */}
          {!isPending ? (
            <Section title={t("detail.review")}>
              <p className="text-muted-foreground mb-1 text-xs">
                {t("detail.reviewer")}: {claim.reviewer ?? "—"} ·{" "}
                {formatDate(claim.reviewed_at)}
              </p>
              {claim.review_note ? (
                <p className="text-sm whitespace-pre-wrap">
                  {claim.review_note}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  {t("detail.noReviewNote")}
                </p>
              )}
            </Section>
          ) : null}

          {/* Actions */}
          {isPending ? (
            <div className="space-y-3 border-t pt-5">
              <div className="space-y-1.5">
                <label htmlFor="claim-note" className="text-sm font-medium">
                  {t("detail.noteLabel")}
                </label>
                <Textarea
                  id="claim-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t("detail.notePlaceholder")}
                  rows={3}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void review("approve")}
                >
                  {t("actions.approve")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => void review("reject")}
                >
                  {t("actions.reject")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-muted-foreground text-xs font-medium">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
