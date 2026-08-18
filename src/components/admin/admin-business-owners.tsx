"use client";

import { UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { AdminBusinessOwner } from "@/app/api/admin/businesses/route";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Manage a business's owner accounts from the admin editor: list current owners (with remove) and add
 * one via a name/email typeahead. Adding the first owner claims the listing. Each change returns the
 * fresh owner list, which is lifted to the editor header.
 */
export function AdminBusinessOwners({
  id,
  owners,
  onChange,
}: {
  id: string;
  owners: AdminBusinessOwner[];
  onChange: (owners: AdminBusinessOwner[]) => void;
}) {
  const t = useTranslations("admin.businesses.owners");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminBusinessOwner[]>([]);
  const [busy, setBusy] = useState(false);

  const search = useCallback(async (value: string) => {
    if (value.trim() === "") {
      setResults([]);
      return;
    }
    try {
      const response = await fetch(
        `/api/admin/users?q=${encodeURIComponent(value.trim())}`,
      );
      const data = (await response.json()) as { data: AdminBusinessOwner[] };
      setResults(data.data);
    } catch {
      setResults([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  async function add(user: AdminBusinessOwner) {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/businesses/${encodeURIComponent(id)}/owners`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id }),
        },
      );
      if (!response.ok) {
        toast.error(t(response.status === 403 ? "forbidden" : "error"));
        return;
      }
      const data = (await response.json()) as { data: AdminBusinessOwner[] };
      onChange(data.data);
      toast.success(t("added"));
      setOpen(false);
      setQuery("");
    } finally {
      setBusy(false);
    }
  }

  async function remove(user: AdminBusinessOwner) {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/businesses/${encodeURIComponent(id)}/owners/${encodeURIComponent(String(user.id))}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        toast.error(t(response.status === 403 ? "forbidden" : "error"));
        return;
      }
      const data = (await response.json()) as { data: AdminBusinessOwner[] };
      onChange(data.data);
      toast.success(t("removed"));
    } finally {
      setBusy(false);
    }
  }

  // Don't offer already-attached users.
  const suggestions = results.filter(
    (user) => !owners.some((owner) => owner.id === user.id),
  );

  return (
    <div className="bg-card space-y-4 rounded-2xl border p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">{t("title")}</h2>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={busy}>
              <UserPlus className="size-4" />
              {t("add")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder={t("searchPlaceholder")}
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                <CommandEmpty>
                  {query.trim() === "" ? t("searchHint") : t("noResults")}
                </CommandEmpty>
                {suggestions.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={String(user.id)}
                    onSelect={() => void add(user)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {user.name}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {user.email}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {owners.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">{t("empty")}</p>
      ) : (
        <ul className="divide-border/60 divide-y">
          {owners.map((owner) => (
            <li
              key={owner.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {owner.name}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {owner.email}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                disabled={busy}
                onClick={() => void remove(owner)}
                aria-label={t("remove")}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
