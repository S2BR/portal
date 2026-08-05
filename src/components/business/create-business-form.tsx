"use client";

import { Building2, User2, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiErrorText } from "@/lib/api/error-text";
import { cn } from "@/lib/utils";

type BusinessType = "company" | "self_employed";

type FieldErrors = { name?: string; type?: string };

/**
 * Create-a-business form — the minimal first version: a name and a type (company or
 * self-employed), mirroring the API's create contract. On success it toasts and returns home;
 * a 422 from the API surfaces inline against the offending field. Address, hours, and
 * description are added later through editing.
 */
export function CreateBusinessForm() {
  const t = useTranslations("businessNew");
  const router = useRouter();

  const [name, setName] = useState("");
  const [type, setType] = useState<BusinessType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  const options: {
    value: BusinessType;
    title: string;
    description: string;
    Icon: LucideIcon;
  }[] = [
    {
      value: "company",
      title: t("types.company.title"),
      description: t("types.company.description"),
      Icon: Building2,
    },
    {
      value: "self_employed",
      title: t("types.selfEmployed.title"),
      description: t("types.selfEmployed.description"),
      Icon: User2,
    },
  ];

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
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (data.status === "ok") {
        toast.success(t("createdToast"));
        router.push("/");
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

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">{t("typeLabel")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((option) => {
            const selected = type === option.value;
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => setType(option.value)}
                aria-pressed={selected}
                className={cn(
                  "focus-visible:ring-ring flex items-start gap-3 rounded-xl border p-4 text-left transition-colors outline-none focus-visible:ring-2",
                  selected
                    ? "border-primary bg-primary/5 ring-primary/20 ring-1"
                    : "hover:border-primary/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    selected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <option.Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{option.title}</span>
                  <span className="text-muted-foreground block text-sm">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {fieldErrors.type ? (
          <p className="text-destructive text-sm">{fieldErrors.type}</p>
        ) : null}
      </fieldset>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
