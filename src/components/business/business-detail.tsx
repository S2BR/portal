"use client";

import { ArrowLeft, Building2, Trash2, User2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import type { Business, BusinessType } from "@/app/api/businesses/route";
import { BusinessTypeField } from "@/components/business/business-type-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorText } from "@/lib/api/error-text";

type EditForm = {
  name: string;
  type: BusinessType | null;
  headline: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  contactWebsite: string;
  addressLine1: string;
  addressLine2: string;
  addressCity: string;
  addressRegion: string;
  addressPostalCode: string;
  addressCountry: string;
};

type StringField = Exclude<keyof EditForm, "type">;

function toForm(business: Business): EditForm {
  const contact = business.metadata?.contact ?? {};
  const address = business.metadata?.address ?? {};
  return {
    name: business.name,
    type: business.type,
    headline: business.headline ?? "",
    description: business.description ?? "",
    contactEmail: contact.email ?? "",
    contactPhone: contact.phone ?? "",
    contactWebsite: contact.website ?? "",
    addressLine1: address.line1 ?? "",
    addressLine2: address.line2 ?? "",
    addressCity: address.city ?? "",
    addressRegion: address.region ?? "",
    addressPostalCode: address.postal_code ?? "",
    addressCountry: address.country ?? "",
  };
}

/** Trim to a value, or null when empty (so a cleared field clears server-side). */
function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Collapse a bag to null when every value is null, so an all-empty section is stored as absent. */
function bagOrNull<T extends Record<string, string | null>>(bag: T): T | null {
  return Object.values(bag).some((value) => value !== null) ? bag : null;
}

function toPayload(form: EditForm) {
  const contact = bagOrNull({
    email: orNull(form.contactEmail),
    phone: orNull(form.contactPhone),
    website: orNull(form.contactWebsite),
  });
  const address = bagOrNull({
    line1: orNull(form.addressLine1),
    line2: orNull(form.addressLine2),
    city: orNull(form.addressCity),
    region: orNull(form.addressRegion),
    postal_code: orNull(form.addressPostalCode),
    country: orNull(form.addressCountry),
  });

  return {
    name: form.name.trim(),
    type: form.type,
    headline: orNull(form.headline),
    description: orNull(form.description),
    metadata:
      contact !== null || address !== null ? { contact, address } : null,
  };
}

/** The address lines assembled for display, skipping the empty parts. */
function addressLines(business: Business): string[] {
  const address = business.metadata?.address;
  if (!address) {
    return [];
  }
  const cityLine = [address.postal_code, address.city]
    .filter(Boolean)
    .join(" ");
  const regionLine = [cityLine, address.region].filter(Boolean).join(", ");
  return [address.line1, address.line2, regionLine, address.country].filter(
    (part): part is string => Boolean(part && part.trim()),
  );
}

export function BusinessDetail({ slug }: { slug: string }) {
  const t = useTranslations("businesses.detail");
  const fields = useTranslations("businesses.detail.fields");
  const sections = useTranslations("businesses.detail.sections");
  const blank = useTranslations("businesses.detail.empty");
  const types = useTranslations("businessNew.types");
  const create = useTranslations("businessNew");
  const format = useFormatter();
  const router = useRouter();

  const [business, setBusiness] = useState<Business | null>(null);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    type?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(slug)}`,
      );
      if (response.status === 404) {
        setMissing(true);
        return;
      }
      const data = (await response.json()) as { business?: Business };
      if (data.business) {
        setBusiness(data.business);
      } else {
        setMissing(true);
      }
    } catch {
      setMissing(true);
    }
  }, [slug]);

  useEffect(() => {
    // One-off fetch on mount; setState runs only after the async response resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const bind =
    (key: StringField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => (prev ? { ...prev, [key]: event.target.value } : prev));

  function startEditing() {
    if (!business) {
      return;
    }
    setForm(toForm(business));
    setError(null);
    setFieldErrors({});
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setError(null);
    setFieldErrors({});
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form) {
      return;
    }

    const localErrors: { name?: string; type?: string } = {};
    if (!form.name.trim()) {
      localErrors.name = create("errorNameRequired");
    }
    if (!form.type) {
      localErrors.type = create("errorTypeRequired");
    }
    if (localErrors.name || localErrors.type) {
      setFieldErrors(localErrors);
      return;
    }

    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(slug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(form)),
        },
      );
      const data = (await response.json()) as {
        status?: string;
        business?: Business;
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (data.status === "ok" && data.business) {
        setBusiness(data.business);
        setEditing(false);
        toast.success(t("savedToast"));
        return;
      }

      if (response.status === 404) {
        setMissing(true);
        return;
      }

      setFieldErrors({
        name: data.errors?.name?.[0],
        type: data.errors?.type?.[0],
      });
      setError(apiErrorText(data) ?? create("errorGeneric"));
    } catch {
      setError(create("errorGeneric"));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(slug)}`,
        {
          method: "DELETE",
        },
      );
      if (response.ok) {
        toast.success(t("deletedToast"));
        router.push("/portal/businesses");
        return;
      }
      toast.error(create("errorGeneric"));
      setDeleting(false);
    } catch {
      toast.error(create("errorGeneric"));
      setDeleting(false);
    }
  }

  const backLink = (
    <Link
      href="/portal/businesses"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
    >
      <ArrowLeft className="size-4 rtl:rotate-180" />
      {t("back")}
    </Link>
  );

  if (missing) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {backLink}
        <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          {t("notFound")}
        </p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {backLink}
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const TypeIcon = business.type === "company" ? Building2 : User2;
  const typeLabel =
    business.type === "company"
      ? types("company.title")
      : types("selfEmployed.title");
  const lines = addressLines(business);
  const contact = business.metadata?.contact;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {backLink}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-xl">
            <TypeIcon className="size-6" />
          </span>
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {business.name}
            </h1>
            <Badge variant="outline">{typeLabel}</Badge>
          </div>
        </div>

        {!editing ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={startEditing}>
              {t("edit")}
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                  {t("delete")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("deleteTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("deleteBody", { name: business.name })}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">{t("cancel")}</Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={remove}
                    disabled={deleting}
                  >
                    {deleting ? t("deleting") : t("deleteConfirm")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>

      {editing && form ? (
        <form onSubmit={save} className="space-y-6" noValidate>
          <div className="space-y-2">
            <Label htmlFor="edit-name">{fields("name")}</Label>
            <Input
              id="edit-name"
              value={form.name}
              onChange={bind("name")}
              maxLength={255}
              aria-invalid={Boolean(fieldErrors.name)}
            />
            {fieldErrors.name ? (
              <p className="text-destructive text-sm">{fieldErrors.name}</p>
            ) : null}
          </div>

          <BusinessTypeField
            value={form.type}
            onChange={(type) =>
              setForm((prev) => (prev ? { ...prev, type } : prev))
            }
            label={create("typeLabel")}
            error={fieldErrors.type}
          />

          <div className="space-y-2">
            <Label htmlFor="edit-headline">{fields("headline")}</Label>
            <Input
              id="edit-headline"
              value={form.headline}
              onChange={bind("headline")}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">{fields("description")}</Label>
            <Textarea
              id="edit-description"
              value={form.description}
              onChange={bind("description")}
              maxLength={5000}
              rows={4}
            />
          </div>

          <fieldset className="space-y-4 rounded-xl border p-4">
            <legend className="px-1 text-sm font-medium">
              {sections("contact")}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-email">{fields("email")}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={form.contactEmail}
                  onChange={bind("contactEmail")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">{fields("phone")}</Label>
                <Input
                  id="edit-phone"
                  value={form.contactPhone}
                  onChange={bind("contactPhone")}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-website">{fields("website")}</Label>
                <Input
                  id="edit-website"
                  value={form.contactWebsite}
                  onChange={bind("contactWebsite")}
                  placeholder="https://"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-xl border p-4">
            <legend className="px-1 text-sm font-medium">
              {sections("address")}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-line1">{fields("line1")}</Label>
                <Input
                  id="edit-line1"
                  value={form.addressLine1}
                  onChange={bind("addressLine1")}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-line2">{fields("line2")}</Label>
                <Input
                  id="edit-line2"
                  value={form.addressLine2}
                  onChange={bind("addressLine2")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-city">{fields("city")}</Label>
                <Input
                  id="edit-city"
                  value={form.addressCity}
                  onChange={bind("addressCity")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-region">{fields("region")}</Label>
                <Input
                  id="edit-region"
                  value={form.addressRegion}
                  onChange={bind("addressRegion")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-postal">{fields("postalCode")}</Label>
                <Input
                  id="edit-postal"
                  value={form.addressPostalCode}
                  onChange={bind("addressPostalCode")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-country">{fields("country")}</Label>
                <Input
                  id="edit-country"
                  value={form.addressCountry}
                  onChange={bind("addressCountry")}
                  maxLength={2}
                  className="uppercase"
                />
              </div>
            </div>
          </fieldset>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? t("saving") : t("save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={cancelEditing}
              disabled={saving}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <Section label={sections("headline")}>
            {business.headline ?? <Muted>{blank("headline")}</Muted>}
          </Section>

          <Section label={sections("description")}>
            {business.description ? (
              <p className="whitespace-pre-line">{business.description}</p>
            ) : (
              <Muted>{blank("description")}</Muted>
            )}
          </Section>

          <Section label={sections("contact")}>
            {contact && (contact.email || contact.phone || contact.website) ? (
              <ul className="space-y-1">
                {contact.email ? <li>{contact.email}</li> : null}
                {contact.phone ? <li>{contact.phone}</li> : null}
                {contact.website ? (
                  <li>
                    <a
                      href={contact.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary hover:underline"
                    >
                      {contact.website}
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : (
              <Muted>{blank("contact")}</Muted>
            )}
          </Section>

          <Section label={sections("address")}>
            {lines.length > 0 ? (
              <address className="not-italic">
                {lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            ) : (
              <Muted>{blank("address")}</Muted>
            )}
          </Section>

          {business.created_at ? (
            <p className="text-muted-foreground border-t pt-4 text-xs">
              {t("created", {
                date: format.dateTime(new Date(business.created_at), {
                  dateStyle: "medium",
                }),
              })}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </h2>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground italic">{children}</span>;
}
