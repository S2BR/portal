"use client";

import { ArrowLeft, Building2, Plus, Trash2, User2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
} from "@/app/api/businesses/route";
import {
  CONTACT_TYPES,
  DAYS,
  SOCIAL_NETWORKS,
  socialLabel,
} from "@/components/business/business-constants";
import type { PlaceAddress } from "@/app/api/addresses/place/[id]/route";
import type { Amenity } from "@/app/api/amenities/route";
import type { Category } from "@/app/api/categories/route";
import { AddressAutocomplete } from "@/components/business/address-autocomplete";
import { AmenitiesPicker } from "@/components/business/amenities-picker";
import { CategoryPicker } from "@/components/business/category-picker";
import { BusinessTypeField } from "@/components/business/business-type-field";
import {
  BusinessGallery,
  BusinessImageField,
} from "@/components/business/business-media";
import {
  formatTime,
  HoursScheduler,
  type WeekSchedule,
} from "@/components/business/hours-scheduler";
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
type AddressEntry = {
  key: string; // stable client key for the list
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
  isMain: boolean;
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
  hours: WeekSchedule;
  addresses: AddressEntry[];
  categoryIds: number[];
  amenityIds: number[];
};

function blankAddress(): AddressEntry {
  return {
    key: crypto.randomUUID(),
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
    isMain: false,
  };
}

function toEditState(business: Business): EditState {
  const hours = Object.fromEntries(
    DAYS.map((day) => {
      const slots = (business.opening_hours ?? [])
        .filter(
          (h) =>
            h.day_of_week === day && !h.closed_all_day && h.open_time != null,
        )
        .map((h) => ({ open: h.open_time ?? "", close: h.close_time ?? "" }));
      return [day, { enabled: slots.length > 0, slots }];
    }),
  ) as WeekSchedule;

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
    addresses: (business.addresses ?? []).map((address) => ({
      key: crypto.randomUUID(),
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
      isMain: address.is_main,
    })),
    categoryIds: (business.categories ?? []).map((category) => category.id),
    amenityIds: (business.amenities ?? []).map((amenity) => amenity.id),
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
    opening_hours: DAYS.flatMap((day) => {
      const schedule = edit.hours[day];
      if (!schedule.enabled) {
        return [];
      }
      return schedule.slots
        .filter((slot) => slot.open.trim() !== "" && slot.close.trim() !== "")
        .map((slot) => ({
          day_of_week: day,
          open_time: slot.open,
          close_time: slot.close,
          closed_all_day: false,
        }));
    }),
    addresses: edit.addresses
      .filter(
        (address) =>
          address.address_1.trim() !== "" || address.city.trim() !== "",
      )
      .map((address) => ({
        address_1: address.address_1.trim(),
        address_2: trimOrNull(address.address_2),
        apartment_suite: trimOrNull(address.apartment_suite),
        city: address.city.trim(),
        state_province: trimOrNull(address.state_province),
        postal_code: trimOrNull(address.postal_code),
        country: address.country.trim().toUpperCase(),
        latitude: numberOrNull(address.latitude),
        longitude: numberOrNull(address.longitude),
        notes: trimOrNull(address.notes),
        is_main: address.isMain,
      })),
    category_ids: edit.categoryIds,
    amenity_ids: edit.amenityIds,
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
  const locale = useLocale();
  const router = useRouter();

  const [business, setBusiness] = useState<Business | null>(null);
  const [missing, setMissing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [amenityGroups, setAmenityGroups] = useState<Amenity[]>([]);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(slug)}`,
      );
      // Only a real 404 means "not yours / gone". Anything else (a transient upstream or refresh
      // blip, a network stutter) is a temporary failure the user can retry — not an access problem.
      if (response.status === 404) {
        setMissing(true);
        return;
      }
      if (!response.ok) {
        setLoadFailed(true);
        return;
      }
      const data = (await response.json()) as { business?: Business };
      if (data.business) {
        setBusiness(data.business);
      } else {
        setLoadFailed(true);
      }
    } catch {
      setLoadFailed(true);
    }
  }, [slug]);

  useEffect(() => {
    // One-off fetch on mount; setState runs only after the async response resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Category tree + amenity groups for the pickers (reference data; loaded once).
  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/categories").then(
        (response) => response.json() as Promise<{ categories?: Category[] }>,
      ),
      fetch("/api/amenities").then(
        (response) => response.json() as Promise<{ amenities?: Amenity[] }>,
      ),
    ])
      .then(([categories, amenities]) => {
        if (!active) {
          return;
        }
        setCategoryTree(categories.categories ?? []);
        setAmenityGroups(amenities.amenities ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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
      <div className="space-y-6">
        {backLink}
        <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          {t("notFound")}
        </p>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="space-y-4 rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">{t("loadError")}</p>
          <Button variant="outline" onClick={() => void load()}>
            {t("retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="space-y-6">
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
    { value: "amenities", label: tabs("amenities") },
    { value: "address", label: tabs("address") },
    { value: "hours", label: tabs("hours") },
    { value: "socials", label: tabs("socials") },
    { value: "branding", label: tabs("branding") },
  ];

  // Selected category slugs (roots and subcategories) drive the amenity filter.
  const selectedCategoryIds = new Set(edit?.categoryIds ?? []);
  const selectedRootSlugs: string[] = [];
  const selectedSubSlugs: string[] = [];
  for (const root of categoryTree) {
    if (selectedCategoryIds.has(root.id)) {
      selectedRootSlugs.push(root.slug);
    }
    for (const sub of root.subcategories ?? []) {
      if (selectedCategoryIds.has(sub.id)) {
        selectedSubSlugs.push(sub.slug);
      }
    }
  }

  return (
    <div className="space-y-6">
      {backLink}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl">
            {business.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
              <img
                src={business.logo}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <TypeIcon className="size-6" />
            )}
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
          <TabsList className="mx-auto w-fit max-w-full">
            {tabItems.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* General */}
          <TabsContent value="general">
            <div className="space-y-6">
              <BusinessImageField
                slug={slug}
                kind="logo"
                value={business.logo}
                onUpdated={(updated) => setBusiness(updated)}
              />
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
                  <Field label={fields("categories")}>
                    <CategoryPicker
                      tree={categoryTree}
                      value={edit.categoryIds}
                      onChange={(categoryIds) => patch({ categoryIds })}
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
                  <ViewBlock label={fields("categories")}>
                    {business.categories && business.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {business.categories.map((category) => (
                          <Badge key={category.id} variant="outline">
                            {category.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <Muted>{blank("categories")}</Muted>
                    )}
                  </ViewBlock>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Amenities */}
          <TabsContent value="amenities">
            {editing && edit ? (
              <AmenitiesPicker
                groups={amenityGroups}
                selectedRootSlugs={selectedRootSlugs}
                selectedSubSlugs={selectedSubSlugs}
                value={edit.amenityIds}
                onChange={(amenityIds) => patch({ amenityIds })}
              />
            ) : business.amenities && business.amenities.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {business.amenities.map((amenity) => (
                  <Badge key={amenity.id} variant="outline">
                    {amenity.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <Muted>{blank("amenities")}</Muted>
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

          {/* Addresses */}
          <TabsContent value="address">
            {editing && edit ? (
              <AddressesEditor
                value={edit.addresses}
                onChange={(addresses) => patch({ addresses })}
              />
            ) : business.addresses && business.addresses.length > 0 ? (
              <div className="space-y-3">
                {business.addresses.map((address) => (
                  <div
                    key={address.id}
                    className="rounded-xl border p-4 text-sm"
                  >
                    {address.is_main ? (
                      <Badge variant="outline" className="mb-2">
                        {t("mainAddress")}
                      </Badge>
                    ) : null}
                    <address className="not-italic">
                      {[
                        address.address_1,
                        address.apartment_suite,
                        address.address_2,
                        [address.postal_code, address.city]
                          .filter(Boolean)
                          .join(" "),
                        address.state_province,
                        address.country,
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
                  </div>
                ))}
              </div>
            ) : (
              <Muted>{blank("address")}</Muted>
            )}
          </TabsContent>

          {/* Opening hours */}
          <TabsContent value="hours">
            {editing && edit ? (
              <HoursScheduler
                value={edit.hours}
                onChange={(hours) => patch({ hours })}
              />
            ) : business.opening_hours && business.opening_hours.length > 0 ? (
              <ul className="divide-y rounded-xl border">
                {DAYS.map((day) => {
                  const ranges = (business.opening_hours ?? []).filter(
                    (hour) =>
                      hour.day_of_week === day &&
                      !hour.closed_all_day &&
                      hour.open_time != null,
                  );
                  return (
                    <li
                      key={day}
                      className="flex items-center justify-between gap-4 p-3 text-sm"
                    >
                      <span className="font-medium">{days(day)}</span>
                      <span className="text-muted-foreground text-end">
                        {ranges.length > 0
                          ? ranges
                              .map(
                                (hour) =>
                                  `${hour.open_time ? formatTime(hour.open_time, locale) : "—"} – ${hour.close_time ? formatTime(hour.close_time, locale) : "—"}`,
                              )
                              .join(", ")
                          : t("closedAllDay")}
                      </span>
                    </li>
                  );
                })}
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
            <div className="space-y-6">
              <BusinessImageField
                slug={slug}
                kind="banner"
                value={business.banner}
                onUpdated={(updated) => setBusiness(updated)}
              />
              <BusinessGallery
                slug={slug}
                images={business.images}
                onUpdated={(updated) => setBusiness(updated)}
              />
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
            </div>
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

type AddressStringField = Exclude<keyof AddressEntry, "isMain" | "key">;

function AddressesEditor({
  value,
  onChange,
}: {
  value: AddressEntry[];
  onChange: (value: AddressEntry[]) => void;
}) {
  const fields = useTranslations("businesses.detail.fields");
  const t = useTranslations("businesses.detail");

  function update(index: number, changes: Partial<AddressEntry>) {
    onChange(
      value.map((entry, position) =>
        position === index ? { ...entry, ...changes } : entry,
      ),
    );
  }

  // Exactly one address is main: checking one unchecks the rest.
  function setMain(index: number, main: boolean) {
    onChange(
      value.map((entry, position) => ({
        ...entry,
        isMain: position === index ? main : main ? false : entry.isMain,
      })),
    );
  }

  function fill(index: number, place: PlaceAddress) {
    update(index, {
      address_1: place.address_1 ?? "",
      apartment_suite: place.apartment_suite ?? "",
      city: place.city ?? "",
      state_province: place.state_province ?? "",
      postal_code: place.postal_code ?? "",
      country: place.country ?? "",
      latitude: place.latitude?.toString() ?? "",
      longitude: place.longitude?.toString() ?? "",
    });
  }

  const set =
    (index: number, key: AddressStringField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update(index, { [key]: event.target.value });

  return (
    <div className="space-y-4">
      {value.map((entry, index) => (
        <div key={entry.key} className="space-y-4 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={entry.isMain}
                onCheckedChange={(checked) => setMain(index, checked === true)}
              />
              {t("mainAddress")}
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("removeAddress")}
              onClick={() =>
                onChange(value.filter((_, position) => position !== index))
              }
            >
              <X className="size-4" />
            </Button>
          </div>

          <AddressAutocomplete onSelect={(place) => fill(index, place)} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label={fields("line1")}>
                <Input
                  value={entry.address_1}
                  onChange={set(index, "address_1")}
                />
              </Field>
            </div>
            <Field label={fields("apartmentSuite")}>
              <Input
                value={entry.apartment_suite}
                onChange={set(index, "apartment_suite")}
              />
            </Field>
            <Field label={fields("line2")}>
              <Input
                value={entry.address_2}
                onChange={set(index, "address_2")}
              />
            </Field>
            <Field label={fields("city")}>
              <Input value={entry.city} onChange={set(index, "city")} />
            </Field>
            <Field label={fields("stateProvince")}>
              <Input
                value={entry.state_province}
                onChange={set(index, "state_province")}
              />
            </Field>
            <Field label={fields("postalCode")}>
              <Input
                value={entry.postal_code}
                onChange={set(index, "postal_code")}
              />
            </Field>
            <Field label={fields("country")}>
              <Input
                value={entry.country}
                onChange={set(index, "country")}
                maxLength={2}
                className="uppercase"
              />
            </Field>
            <Field label={fields("latitude")}>
              <Input
                value={entry.latitude}
                onChange={set(index, "latitude")}
                inputMode="decimal"
              />
            </Field>
            <Field label={fields("longitude")}>
              <Input
                value={entry.longitude}
                onChange={set(index, "longitude")}
                inputMode="decimal"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label={fields("notes")}>
                <Textarea
                  value={entry.notes}
                  onChange={set(index, "notes")}
                  rows={2}
                />
              </Field>
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, blankAddress()])}
      >
        <Plus className="size-4" />
        {t("addAddress")}
      </Button>
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
