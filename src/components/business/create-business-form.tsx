"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import type { Business, BusinessType } from "@/app/api/businesses/route";
import { BusinessTypeField } from "@/components/business/business-type-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorText } from "@/lib/api/error-text";

type FieldErrors = { name?: string; type?: string };

/**
 * Create-a-business form — the minimal first version: a name and a type (company or
 * self-employed), mirroring the API's create contract. On success it toasts and routes to the
 * new business's detail page; a 422 from the API surfaces inline against the offending field.
 * Address, hours, and description are added there through editing.
 */
export function CreateBusinessForm() {
  const t = useTranslations("businessNew");
  const router = useRouter();

  const [name, setName] = useState("");
  const [type, setType] = useState<BusinessType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();

    const trimmed = name.trim();
    const localErrors: FieldErrors = {};
    if (!trimmed) {
      localErrors.name = t("errorNameRequired");
    }
    if (!type) {
      localErrors.type = t("errorTypeRequired");
    }
    if (localErrors.name || localErrors.type) {
      setFieldErrors(localErrors);
      return;
    }

    setPending(true);
    setError(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, type }),
      });
      const data = (await response.json()) as {
        status?: string;
        business?: Business;
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (data.status === "ok" && data.business) {
        toast.success(t("createdToast"));
        router.push(`/portal/businesses/${data.business.slug}`);
        return;
      }

      setFieldErrors({
        name: data.errors?.name?.[0],
        type: data.errors?.type?.[0],
      });
      setError(apiErrorText(data) ?? t("errorGeneric"));
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="business-name">{t("nameLabel")}</Label>
        <Input
          id="business-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("namePlaceholder")}
          maxLength={255}
          autoFocus
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name ? (
          <p className="text-destructive text-sm">{fieldErrors.name}</p>
        ) : null}
      </div>

      <BusinessTypeField
        value={type}
        onChange={setType}
        label={t("typeLabel")}
        error={fieldErrors.type}
      />

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
