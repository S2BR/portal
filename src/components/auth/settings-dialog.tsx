"use client";

import {
  Mail,
  MonitorSmartphone,
  ShieldCheck,
  TriangleAlert,
  User,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { AvatarSettings } from "@/components/auth/avatar-settings";
import { useCurrentUser } from "@/components/auth/current-user";
import { DeleteAccountSettings } from "@/components/auth/delete-account-settings";
import { EmailSettings } from "@/components/auth/email-settings";
import { PasskeySettings } from "@/components/auth/passkey-settings";
import { PasswordSettings } from "@/components/auth/password-settings";
import { ProfileSettings } from "@/components/auth/profile-settings";
import { SessionSettings } from "@/components/auth/session-settings";
import { TwoFactorSettings } from "@/components/auth/two-factor-settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type SectionKey =
  "profile" | "account" | "security" | "sessions" | "danger";

/** The settings categories — each renders one or more of the existing settings cards. */
const SECTIONS: {
  key: SectionKey;
  icon: LucideIcon;
  render: () => ReactNode;
}[] = [
  {
    key: "profile",
    icon: User,
    render: () => (
      <>
        <AvatarSettings />
        <ProfileSettings />
      </>
    ),
  },
  { key: "account", icon: Mail, render: () => <EmailSettings /> },
  {
    key: "security",
    icon: ShieldCheck,
    render: () => (
      <>
        <PasswordSettings />
        <TwoFactorSettings />
        <PasskeySettings />
      </>
    ),
  },
  {
    key: "sessions",
    icon: MonitorSmartphone,
    render: () => <SessionSettings />,
  },
  {
    key: "danger",
    icon: TriangleAlert,
    render: () => <DeleteAccountSettings />,
  },
];

interface SettingsDialogState {
  /** Open the settings dialog, optionally jumping straight to a section. */
  open: (section?: SectionKey) => void;
}

const SettingsDialogContext = createContext<SettingsDialogState>({
  open: () => {},
});

export function useSettingsDialog(): SettingsDialogState {
  return useContext(SettingsDialogContext);
}

/** The URL that also opens the dialog — for people who type/bookmark `/profile` directly. */
const PROFILE_PATH = "/profile";

/**
 * Provides the app-wide settings dialog. Mount once (root layout).
 *
 * Opening from within the app (e.g. the user menu) overlays the dialog IN PLACE — no navigation —
 * so the page underneath is never unmounted and doesn't reload when you close it. As a convenience,
 * the dialog ALSO opens when the URL is `/profile` (a typed URL / bookmark); closing then leaves
 * that URL. The section content only mounts while the dialog is open (Radix doesn't render closed
 * content).
 */
export function SettingsDialogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState<SectionKey>("profile");
  // Overlaid in place from the app (no navigation), so closing doesn't reload what's underneath.
  const [openedInPlace, setOpenedInPlace] = useState(false);

  const onProfileUrl = pathname === PROFILE_PATH;
  const isOpen = openedInPlace || onProfileUrl;

  const open = useCallback((section?: SectionKey) => {
    setActive(section ?? "profile");
    setOpenedInPlace(true);
  }, []);

  // Any real navigation dismisses an in-place overlay (e.g. an action inside settings that routes
  // away), so it never lingers over a different page.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenedInPlace(false);
  }, [pathname]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        return;
      }
      setOpenedInPlace(false);
      // Only navigate when the dialog was opened by the /profile URL itself; an in-place overlay
      // just closes, leaving the underlying page (and its state) exactly as it was.
      if (onProfileUrl) {
        router.push("/");
      }
    },
    [onProfileUrl, router],
  );

  return (
    <SettingsDialogContext.Provider value={{ open }}>
      {children}
      <SettingsDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        active={active}
        onActiveChange={setActive}
      />
    </SettingsDialogContext.Provider>
  );
}

function SettingsDialog({
  open,
  onOpenChange,
  active,
  onActiveChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: SectionKey;
  onActiveChange: (section: SectionKey) => void;
}) {
  const t = useTranslations("profile");
  const { user } = useCurrentUser();

  const current =
    SECTIONS.find((section) => section.key === active) ?? SECTIONS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:h-[80vh] sm:max-h-[44rem] sm:max-w-4xl sm:flex-row">
        {/* Category nav — a left rail on desktop, a scrollable row on mobile. */}
        <div className="bg-muted/30 flex shrink-0 flex-col border-b sm:w-56 sm:border-e sm:border-b-0">
          <DialogTitle className="px-4 pt-4 pb-1 text-sm font-semibold tracking-tight sm:px-6 sm:pt-5 sm:pb-2">
            {t("settingsTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("settingsDescription")}
          </DialogDescription>
          <nav className="flex gap-1 overflow-x-auto p-2 sm:flex-1 sm:flex-col sm:gap-1 sm:overflow-x-visible sm:overflow-y-auto sm:p-3">
            {SECTIONS.map((section) => {
              const isActive = section.key === active;
              const isDanger = section.key === "danger";
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => onActiveChange(section.key)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-background font-medium shadow-sm"
                      : "hover:bg-background/60",
                    isDanger
                      ? "text-destructive"
                      : isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <section.icon className="size-4 shrink-0" />
                  <span>{t(`nav.${section.key}`)}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Active section content. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center border-b px-6 sm:px-8">
            <h2
              className={cn(
                "font-heading text-base font-semibold tracking-tight",
                active === "danger" && "text-destructive",
              )}
            >
              {t(`nav.${active}`)}
            </h2>
          </div>
          {/* Strip the card chrome (ring + shadow) for the sections in here so they blend into the
              dialog and read as one panel — they're already bg-card, same as this pane. */}
          {/* Sections are borderless here, so strip the cards' own box padding (py + header/content
              px) — content aligns flush to the panel and the space-y-8 does the separation. */}
          <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6 sm:px-8 [&_[data-slot=card-content]]:px-0 [&_[data-slot=card-header]]:px-0 [&_[data-slot=card]]:gap-4 [&_[data-slot=card]]:py-0 [&_[data-slot=card]]:shadow-none [&_[data-slot=card]]:ring-0">
            {user && current ? current.render() : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
