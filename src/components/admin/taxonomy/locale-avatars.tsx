import { LocaleFlag } from "@/components/locale-flag";
import { Avatar } from "@/components/ui/avatar";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { locales, localeNames } from "@/i18n/config";
import { type LocaleText, type TaxonomyLocale } from "@/lib/taxonomy/admin";
import { cn } from "@/lib/utils";

/**
 * An {@link AvatarGroup} of the supported locales, one round flag each (the same
 * `/images/flags/<locale>.png` assets the locale switcher uses), in the portal's canonical language
 * order ({@link locales}). A locale that HAS a translated value reads in full color, a missing one is
 * dimmed + grayscaled — so translation gaps are visible at a glance on each row without opening the
 * editor. Coverage is measured on the node name (the required field; descriptions are optional). The
 * portal's locale codes are hyphenated (`fr-CA`); the stored name is keyed by the underscored API
 * form (`fr_CA`).
 */
export function LocaleAvatars({
  name,
  className,
}: {
  name: LocaleText;
  className?: string;
}) {
  return (
    <AvatarGroup className={className}>
      {locales.map((locale) => {
        const key = locale.replace("-", "_") as TaxonomyLocale;
        const translated = Boolean(name[key]?.trim());
        return (
          <Avatar
            key={locale}
            size="sm"
            title={`${localeNames[locale]}${translated ? "" : " —"}`}
          >
            <LocaleFlag
              locale={locale}
              className={cn("size-full", !translated && "opacity-35 grayscale")}
            />
          </Avatar>
        );
      })}
    </AvatarGroup>
  );
}
