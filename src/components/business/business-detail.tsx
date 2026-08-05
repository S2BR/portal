"use client";

import { ArrowLeft, Building2, Plus, Trash2, User2, X } from "lucide-react";
import { useTranslations } from "next-intl";
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

import type {
  Business,
  BusinessContactType,
  BusinessSocialNetwork,
  BusinessType,
  DayOfWeek,
} from "@/app/api/businesses/route";
import {
  CONTACT_TYPES,
  DAYS,
  SOCIAL_NETWORKS,
  socialLabel,
} from "@/components/business/business-constants";
import { BusinessTypeField } from "@/components/business/business-type-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiErrorText } from "@/lib/api/error-text";

type ContactRow = { type: BusinessContactType; value: string; name: string };
type SocialRow = { platform: BusinessSocialNetwork; handle: string };
type HourRow = { open: string; close: string; closed: boolean };
type AddressForm = {
  address_1: string;
  address_2: string;
  apartment_suite: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  latitude: string;
  longitude: string;
  notes: string;
};
type EditState = {
  name: string;
  type: BusinessType | null;
  headline: string;
  description: string;
  categorySuggestion: string;
  colorPrimary: string;
  contacts: ContactRow[];
  socials: SocialRow[];
  hours: Record<DayOfWeek, HourRow>;
  address: AddressForm;
};

const EMPTY_ADDRESS: AddressForm = {
  address_1: "",
  address_2: "",
  apartment_suite: "",
  city: "",
  state_province: "",
  postal_code: "",
  country: "",
  latitude: "",
  longitude: "",
  notes: "",
};

function toEditState(business: Business): EditState {
  const hours = Object.fromEntries(
    DAYS.map((day) => {
      const found = business.opening_hours?.find((h) => h.day_of_week === day);
      return [
        day,
        {
          open: found?.open_time ?? "",
          close: found?.close_time ?? "",
          closed: found?.closed_all_day ?? false,
        },
      ];
    }),
  ) as Record<DayOfWeek, HourRow>;

  const address = business.address;

  return {
    name: business.name,
    type: business.type,
    headline: business.headline ?? "",
    description: business.description ?? "",
    categorySuggestion: business.category_suggestion ?? "",
    colorPrimary: business.colors?.primary ?? "",
    contacts: (business.contacts ?? []).map((contact) => ({
      type: contact.type,
      value: contact.value,
      name: contact.name ?? "",
    })),
    socials: (business.socials ?? []).map((social) => ({
      platform: social.platform,
      handle: social.handle,
    })),
    hours,
    address: address
      ? {
          address_1: address.address_1 ?? "",
          address_2: address.address_2 ?? "",
          apartment_suite: address.apartment_suite ?? "",
          city: address.city ?? "",
          state_province: address.state_province ?? "",
          postal_code: address.postal_code ?? "",
          country: address.country ?? "",
          latitude: address.latitude?.toString() ?? "",
          longitude: address.longitude?.toString() ?? "",
          notes: address.notes ?? "",
        }
      : { ...EMPTY_ADDRESS },
  };
}

function trimOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildPayload(edit: EditState) {
  const hasAddress = Object.values(edit.address).some(
    (value) => value.trim() !== "",
  );

  return {
    name: edit.name.trim(),
    type: edit.type,
    headline: trimOrNull(edit.headline),
    description: trimOrNull(edit.description),
    category_suggestion: trimOrNull(edit.categorySuggestion),
    colors: trimOrNull(edit.colorPrimary)
      ? { primary: edit.colorPrimary.trim() }
      : null,
    contacts: edit.contacts
      .filter((contact) => contact.value.trim() !== "")
      .map((contact) => ({
        type: contact.type,
        value: contact.value.trim(),
        name: trimOrNull(contact.name),
      })),
    socials: edit.socials
      .filter((social) => social.handle.trim() !== "")
      .map((social) => ({
        platform: social.platform,
        handle: social.handle.trim(),
      })),
    opening_hours: DAYS.filter(
      (day) => edit.hours[day].closed || edit.hours[day].open.trim() !== "",
    ).map((day) => ({
      day_of_week: day,
      open_time: edit.hours[day].closed
        ? null
        : trimOrNull(edit.hours[day].open),
      close_time: edit.hours[day].closed
        ? null
        : trimOrNull(edit.hours[day].close),
      closed_all_day: edit.hours[day].closed,
    })),
    address: hasAddress
      ? {
          address_1: edit.address.address_1.trim(),
          address_2: trimOrNull(edit.address.address_2),
          apartment_suite: trimOrNull(edit.address.apartment_suite),
          city: edit.address.city.trim(),
          state_province: trimOrNull(edit.address.state_province),
          postal_code: trimOrNull(edit.address.postal_code),
          country: edit.address.country.trim().toUpperCase(),
          latitude: numberOrNull(edit.address.latitude),
          longitude: numberOrNull(edit.address.longitude),
          notes: trimOrNull(edit.address.notes),
        }
      : null,
  };
}

export function BusinessDetail({ slug }: { slug: string }) {
  const t = useTranslations("businesses.detail");
  const tabs = useTranslations("businesses.detail.tabs");
  const fields = useTranslations("businesses.detail.fields");
  const days = useTranslations("businesses.detail.days");
  const contactTypeLabels = useTranslations("businesses.detail.contactTypes");
  const blank = useTranslations("businesses.detail.empty");
  const types = useTranslations("businessNew.types");
  const create = useTranslations("businessNew");
  const router = useRouter();

  const [business, setBusiness] = useState<Business | null>(null);
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
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

  function startEditing() {
    if (!business) {
      return;
    }
    setEdit(toEditState(business));
    setError(null);
    setNameError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setError(null);
    setNameError(null);
  }

  /** Patch the edit state immutably. */
  function patch(changes: Partial<EditState>) {
    setEdit((prev) => (prev ? { ...prev, ...changes } : prev));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!edit) {
      return;
    }
    if (!edit.name.trim()) {
      setNameError(create("errorNameRequired"));
      return;
    }

    setSaving(true);
    setError(null);
    setNameError(null);

    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(slug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(edit)),
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
      setNameError(data.errors?.name?.[0] ?? null);
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
      <div className="mx-auto max-w-3xl space-y-6">
        {backLink}
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const TypeIcon = business.type === "company" ? Building2 : User2;
  const typeLabel =
    business.type === "company"
      ? types("company.title")
      : types("selfEmployed.title");

  const tabItems = [
    { value: "general", label: tabs("general") },
    { value: "contact", label: tabs("contact") },
    { value: "address", label: tabs("address") },
    { value: "hours", label: tabs("hours") },
    { value: "socials", label: tabs("socials") },
    { value: "branding", label: tabs("branding") },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
            <DeleteButton
              name={business.name}
              deleting={deleting}
              onConfirm={remove}
            />
          </div>
        ) : null}
      </div>

      <form onSubmit={save}>
        <Tabs defaultValue="general">
          <TabsList>
            {tabItems.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* General */}
          <TabsContent value="general">
            {editing && edit ? (
              <div className="space-y-5">
                <Field label={fields("name")} error={nameError}>
                  <Input
                    value={edit.name}
                    onChange={(event) => patch({ name: event.target.value })}
                    maxLength={255}
                    aria-invalid={Boolean(nameError)}
                  />
                </Field>
                <BusinessTypeField
                  value={edit.type}
                  onChange={(type) => patch({ type })}
                  label={create("typeLabel")}
                />
                <Field label={fields("headline")}>
                  <Input
                    value={edit.headline}
                    onChange={(event) =>
                      patch({ headline: event.target.value })
                    }
                    maxLength={255}
                  />
                </Field>
                <Field label={fields("description")}>
                  <Textarea
                    value={edit.description}
                    onChange={(event) =>
                      patch({ description: event.target.value })
                    }
                    maxLength={5000}
                    rows={4}
                  />
                </Field>
                <Field
                  label={fields("categorySuggestion")}
                  hint={t("categoryHint")}
                >
                  <Input
                    value={edit.categorySuggestion}
                    onChange={(event) =>
                      patch({ categorySuggestion: event.target.value })
                    }
                    maxLength={500}
                  />
                </Field>
              </div>
            ) : (
              <div className="space-y-5">
                <ViewBlock label={fields("headline")}>
                  {business.headline ?? <Muted>{blank("headline")}</Muted>}
                </ViewBlock>
                <ViewBlock label={fields("description")}>
                  {business.description ? (
                    <p className="whitespace-pre-line">
                      {business.description}
                    </p>
                  ) : (
                    <Muted>{blank("description")}</Muted>
                  )}
                </ViewBlock>
              </div>
            )}
          </TabsContent>

          {/* Contact */}
          <TabsContent value="contact">
            {editing && edit ? (
              <RepeaterEditor
                rows={edit.contacts}
                onChange={(contacts) => patch({ contacts })}
                addLabel={t("addContact")}
                makeRow={(): ContactRow => ({
                  type: "website",
                  value: "",
                  name: "",
                })}
                renderRow={(row, update) => (
                  <>
                    <Select
                      value={row.type}
                      onValueChange={(value) =>
                        update({ type: value as BusinessContactType })
                      }
                    >
                      <SelectTrigger className="sm:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {contactTypeLabels(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={row.value}
                      onChange={(event) =>
                        update({ value: event.target.value })
                      }
                      placeholder={fields("contactValue")}
                      className="flex-1"
                    />
                    <Input
                      value={row.name}
                      onChange={(event) => update({ name: event.target.value })}
                      placeholder={fields("contactLabel")}
                      className="sm:w-40"
                    />
                  </>
                )}
              />
            ) : business.contacts && business.contacts.length > 0 ? (
              <ul className="divide-y rounded-xl border">
                {business.contacts.map((contact, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <span className="text-muted-foreground w-20 shrink-0 capitalize">
                      {contactTypeLabels(contact.type)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {contact.value}
                    </span>
                    {contact.name ? (
                      <span className="text-muted-foreground shrink-0">
                        {contact.name}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Muted>{blank("contact")}</Muted>
            )}
          </TabsContent>

          {/* Address */}
          <TabsContent value="address">
            {editing && edit ? (
              <AddressEditor
                value={edit.address}
                onChange={(address) => patch({ address })}
              />
            ) : business.address ? (
              <address className="text-sm not-italic">
                {[
                  business.address.address_1,
                  business.address.apartment_suite,
                  business.address.address_2,
                  [business.address.postal_code, business.address.city]
                    .filter(Boolean)
                    .join(" "),
                  business.address.state_province,
                  business.address.country,
                ]
                  .filter((line): line is string =>
                    Boolean(line && line.trim()),
                  )
                  .map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
              </address>
            ) : (
              <Muted>{blank("address")}</Muted>
            )}
          </TabsContent>

          {/* Opening hours */}
          <TabsContent value="hours">
            {editing && edit ? (
              <div className="space-y-2">
                {DAYS.map((day) => {
                  const row = edit.hours[day];
                  return (
                    <div
                      key={day}
                      className="flex flex-wrap items-center gap-3 rounded-lg border p-2.5"
                    >
                      <span className="w-24 shrink-0 text-sm font-medium">
                        {days(day)}
                      </span>
                      <label className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={row.closed}
                          onCheckedChange={(checked) =>
                            patch({
                              hours: {
                                ...edit.hours,
                                [day]: { ...row, closed: checked === true },
                              },
                            })
                          }
                        />
                        {t("closedAllDay")}
                      </label>
                      {!row.closed ? (
                        <div className="ms-auto flex items-center gap-2">
                          <Input
                            type="time"
                            value={row.open}
                            onChange={(event) =>
                              patch({
                                hours: {
                                  ...edit.hours,
                                  [day]: { ...row, open: event.target.value },
                                },
                              })
                            }
                            className="w-32"
                            aria-label={fields("open")}
                          />
                          <span className="text-muted-foreground">–</span>
                          <Input
                            type="time"
                            value={row.close}
                            onChange={(event) =>
                              patch({
                                hours: {
                                  ...edit.hours,
                                  [day]: { ...row, close: event.target.value },
                                },
                              })
                            }
                            className="w-32"
                            aria-label={fields("close")}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : business.opening_hours && business.opening_hours.length > 0 ? (
              <ul className="divide-y rounded-xl border">
                {business.opening_hours.map((hour) => (
                  <li
                    key={hour.day_of_week}
                    className="flex items-center justify-between p-3 text-sm"
                  >
                    <span className="font-medium">
                      {days(hour.day_of_week)}
                    </span>
                    <span className="text-muted-foreground">
                      {hour.closed_all_day
                        ? t("closedAllDay")
                        : `${hour.open_time ?? "—"} – ${hour.close_time ?? "—"}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Muted>{blank("hours")}</Muted>
            )}
          </TabsContent>

          {/* Socials */}
          <TabsContent value="socials">
            {editing && edit ? (
              <RepeaterEditor
                rows={edit.socials}
                onChange={(socials) => patch({ socials })}
                addLabel={t("addSocial")}
                makeRow={(): SocialRow => ({
                  platform: "instagram",
                  handle: "",
                })}
                renderRow={(row, update) => (
                  <>
                    <Select
                      value={row.platform}
                      onValueChange={(value) =>
                        update({ platform: value as BusinessSocialNetwork })
                      }
                    >
                      <SelectTrigger className="sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOCIAL_NETWORKS.map((network) => (
                          <SelectItem key={network.value} value={network.value}>
                            {network.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={row.handle}
                      onChange={(event) =>
                        update({ handle: event.target.value })
                      }
                      placeholder={fields("handle")}
                      className="flex-1"
                    />
                  </>
                )}
              />
            ) : business.socials && business.socials.length > 0 ? (
              <ul className="divide-y rounded-xl border">
                {business.socials.map((social, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between p-3 text-sm"
                  >
                    <span className="font-medium">
                      {socialLabel(social.platform)}
                    </span>
                    <span className="text-muted-foreground">
                      {social.handle}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Muted>{blank("socials")}</Muted>
            )}
          </TabsContent>

          {/* Branding */}
          <TabsContent value="branding">
            {editing && edit ? (
              <Field label={fields("color")} hint={t("colorHint")}>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(edit.colorPrimary)
                        ? edit.colorPrimary
                        : "#000000"
                    }
                    onChange={(event) =>
                      patch({ colorPrimary: event.target.value })
                    }
                    className="border-input size-11 shrink-0 cursor-pointer rounded-lg border bg-transparent p-1"
                    aria-label={fields("color")}
                  />
                  <Input
                    value={edit.colorPrimary}
                    onChange={(event) =>
                      patch({ colorPrimary: event.target.value })
                    }
                    placeholder="#0a7d4b"
                    className="max-w-40"
                  />
                </div>
              </Field>
            ) : business.colors?.primary ? (
              <div className="flex items-center gap-3 text-sm">
                <span
                  className="border-input size-8 rounded-lg border"
                  style={{ backgroundColor: business.colors.primary }}
                  aria-hidden
                />
                <span className="font-mono">{business.colors.primary}</span>
              </div>
            ) : (
              <Muted>{blank("branding")}</Muted>
            )}
          </TabsContent>
        </Tabs>

        {editing ? (
          <div className="mt-6 space-y-3">
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
          </div>
        ) : null}
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

function ViewBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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
  return <p className="text-muted-foreground text-sm italic">{children}</p>;
}

/**
 * A minimal add/remove repeater over rows of shape `TRow`. `renderRow` draws a row's controls and
 * receives an `update` that merges a partial into that row; `makeRow` seeds a new row on add.
 */
function RepeaterEditor<TRow>({
  rows,
  onChange,
  addLabel,
  makeRow,
  renderRow,
}: {
  rows: TRow[];
  onChange: (rows: TRow[]) => void;
  addLabel: string;
  makeRow: () => TRow;
  renderRow: (row: TRow, update: (changes: Partial<TRow>) => void) => ReactNode;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          {renderRow(row, (changes) =>
            onChange(
              rows.map((current, position) =>
                position === index ? { ...current, ...changes } : current,
              ),
            ),
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="remove"
            onClick={() =>
              onChange(rows.filter((_, position) => position !== index))
            }
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rows, makeRow()])}
      >
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  );
}

function AddressEditor({
  value,
  onChange,
}: {
  value: AddressForm;
  onChange: (value: AddressForm) => void;
}) {
  const fields = useTranslations("businesses.detail.fields");
  const set =
    (key: keyof AddressForm) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...value, [key]: event.target.value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={fields("line1")}>
        <Input value={value.address_1} onChange={set("address_1")} />
      </Field>
      <Field label={fields("apartmentSuite")}>
        <Input
          value={value.apartment_suite}
          onChange={set("apartment_suite")}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label={fields("line2")}>
          <Input value={value.address_2} onChange={set("address_2")} />
        </Field>
      </div>
      <Field label={fields("city")}>
        <Input value={value.city} onChange={set("city")} />
      </Field>
      <Field label={fields("stateProvince")}>
        <Input value={value.state_province} onChange={set("state_province")} />
      </Field>
      <Field label={fields("postalCode")}>
        <Input value={value.postal_code} onChange={set("postal_code")} />
      </Field>
      <Field label={fields("country")}>
        <Input
          value={value.country}
          onChange={set("country")}
          maxLength={2}
          className="uppercase"
        />
      </Field>
      <Field label={fields("latitude")}>
        <Input
          value={value.latitude}
          onChange={set("latitude")}
          inputMode="decimal"
        />
      </Field>
      <Field label={fields("longitude")}>
        <Input
          value={value.longitude}
          onChange={set("longitude")}
          inputMode="decimal"
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label={fields("notes")}>
          <Textarea value={value.notes} onChange={set("notes")} rows={2} />
        </Field>
      </div>
    </div>
  );
}

function DeleteButton({
  name,
  deleting,
  onConfirm,
}: {
  name: string;
  deleting: boolean;
  onConfirm: () => void;
}) {
  const t = useTranslations("businesses.detail");

  return (
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
          <DialogDescription>{t("deleteBody", { name })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t("cancel")}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? t("deleting") : t("deleteConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
