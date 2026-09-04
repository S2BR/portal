"use client";

import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { CatalogSighting } from "@/app/api/businesses/[slug]/products/route";
import {
  MoneyInput,
  ProductThumb,
} from "@/components/business/products/owner-products";
import { FormSection } from "@/components/business/form-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENCIES } from "@/lib/products/currencies";
import {
  OFFERING_STATUSES,
  OFFERING_STATUS_VARIANT,
  type OfferingStatus,
} from "@/lib/products/offering-status";
import { unitFor } from "@/lib/products/units";

/**
 * The owner's page for one catalog product (a sighting): its product summary plus the price, currency,
 * and offering status the owner controls. Setting the status to Paused / Out of stock / Coming soon /
 * Discontinued temporarily (or permanently) stops offering it to customers, one control.
 */
export function OwnerProductDetail({
  businessSlug,
  id,
}: {
  businessSlug: string;
  id: string;
}) {
  const t = useTranslations("businesses.products");
  const tStatus = useTranslations("offeringStatus");
  const router = useRouter();

  const base = `/api/businesses/${encodeURIComponent(businessSlug)}/products`;
  const listHref = `/portal/businesses/${encodeURIComponent(businessSlug)}/products`;

  const [item, setItem] = useState<CatalogSighting | null>(null);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>(CURRENCIES[0]);
  const [status, setStatus] = useState<OfferingStatus>("available");
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const response = await fetch(`${base}/${id}`);
      if (!active) {
        return;
      }
      if (response.status === 404) {
        router.replace(listHref);
        return;
      }
      if (!response.ok) {
        toast.error(t("loadError"));
        setLoading(false);
        return;
      }
      const data = (await response.json()) as { product: CatalogSighting };
      setItem(data.product);
      setPrice(data.product.price);
      setCurrency(data.product.currency ?? CURRENCIES[0]);
      setStatus(data.product.offering_status as OfferingStatus);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [base, id, listHref, router, t]);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${base}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price, currency, offering_status: status }),
      });
      if (!response.ok) {
        toast.error(t("actionError"));
        return;
      }
      const data = (await response.json()) as { product: CatalogSighting };
      setItem(data.product);
      toast.success(t("updated"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`${base}/${id}`, { method: "DELETE" });
      if (!response.ok) {
        toast.error(t("actionError"));
        return;
      }
      toast.success(t("removed"));
      router.push(listHref);
    } finally {
      setDeleting(false);
      setPendingDelete(false);
    }
  };

  const product = item?.variant?.product ?? null;
  const quantity =
    [item?.variant?.size, unitFor(item?.variant?.unit)?.symbol]
      .filter((part): part is string => Boolean(part))
      .join(" ") ||
    (item?.variant?.label ?? null);

  return (
    <div className="space-y-8">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground mb-2 -ml-2 gap-1.5"
        >
          <Link href={listHref}>
            <ArrowLeft className="size-4" aria-hidden />
            {t("detail.back")}
          </Link>
        </Button>
        {loading ? (
          <Skeleton className="h-9 w-64" />
        ) : (
          <div className="flex items-center gap-3">
            <ProductThumb
              image={product?.image ?? null}
              name={product?.name ?? ""}
            />
            <div className="min-w-0">
              <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
                {product?.name ?? "—"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {[product?.brand, quantity].filter(Boolean).join(" · ") || " "}
              </p>
            </div>
            {item ? (
              <Badge
                variant={
                  OFFERING_STATUS_VARIANT[
                    item.offering_status as OfferingStatus
                  ]
                }
                className="ms-auto shrink-0"
              >
                {tStatus(item.offering_status)}
              </Badge>
            ) : null}
          </div>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : item ? (
        <div className="space-y-10">
          <FormSection
            id="section-offer"
            editing
            title={t("detail.offerTitle")}
            description={t("detail.offerDescription")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("price")}>
                <MoneyInput value={price} onChange={setPrice} />
              </Field>
              <Field label={t("currency")}>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field
              label={t("detail.statusLabel")}
              hint={t("detail.statusHint")}
            >
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as OfferingStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFERING_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tStatus(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive gap-1.5"
                onClick={() => setPendingDelete(true)}
              >
                <Trash2 className="size-4" aria-hidden />
                {t("remove")}
              </Button>
              <Button onClick={save} disabled={saving} className="gap-1.5">
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t("save")}
              </Button>
            </div>
          </FormSection>
        </div>
      ) : null}

      <Dialog
        open={pendingDelete}
        onOpenChange={(open) => (!open ? setPendingDelete(false) : undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("removeConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={deleting}>
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void remove()}
            >
              {t("remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
