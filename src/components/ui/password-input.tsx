"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A password field with a show/hide toggle. Drop-in for {@link Input} — omit `type`; it
 * flips between `password` and `text`. The toggle sits inside the field and reserves space
 * with `pr-11` so it never overlaps the value.
 */
function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = React.useState(false);
  const t = useTranslations("auth");

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        aria-pressed={visible}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg outline-none focus-visible:ring-2"
      >
        {visible ? (
          <EyeOffIcon className="size-4.5" aria-hidden />
        ) : (
          <EyeIcon className="size-4.5" aria-hidden />
        )}
      </button>
    </div>
  );
}

export { PasswordInput };
