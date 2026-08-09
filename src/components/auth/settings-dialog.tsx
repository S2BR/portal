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
  useRef,
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

type SectionKey = "profile" | "account" | "security" | "sessions" | "danger";

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

/** The URL that represents "settings open" — the dialog is shown whenever the app is here. */
const PROFILE_PATH = "/profile";

/**
 * Provides the app-wide settings dialog. Mount once (root layout). The dialog IS the `/profile`
 * route: it's shown whenever the URL is `/profile` — so it opens from a menu click, a typed URL, a
 * bookmark, or a refresh, from anywhere. The section content only mounts while the dialog is open
 * (Radix doesn't render closed content).
 */
export function SettingsDialogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState<SectionKey>("profile");
  // Whether we arrived at /profile via an in-app open() (so closing can return where we were).
  const openedInApp = useRef(false);

  const isOpen = pathname === PROFILE_PATH;

  const open = useCallback(
    (section?: SectionKey) => {
      setActive(section ?? "profile");
      openedInApp.current = true;
      router.push(PROFILE_PATH);
    },
    [router],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      // Opening is driven by navigation, not the dialog. On close, leave the /profile URL: return to
      // the previous page when we opened from within the app, else (typed URL / bookmark) go home.
      if (next) {
        return;
      }
      if (openedInApp.current) {
        openedInApp.current = false;
        router.back();
      } else {
        router.push("/");
      }
    },
    [router],
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
      <DialogContent className="flex h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:h-[80vh] sm:max-w-3xl sm:flex-row">
        {/* Category nav — a left rail on desktop, a scrollable row on mobile. */}
        <div className="bg-muted/30 flex shrink-0 flex-col border-b sm:w-56 sm:border-e sm:border-b-0">
          <DialogTitle className="px-4 pt-4 pb-1 text-sm font-semibold tracking-tight sm:px-3">
            {t("settingsTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("settingsDescription")}
          </DialogDescription>
          <nav className="flex gap-1 overflow-x-auto p-2 sm:flex-1 sm:flex-col sm:overflow-x-visible sm:overflow-y-auto">
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
          <div className="flex h-14 shrink-0 items-center border-b px-6">
            <h2
              className={cn(
                "font-heading text-base font-semibold tracking-tight",
                active === "danger" && "text-destructive",
              )}
            >
              {t(`nav.${active}`)}
            </h2>
          </div>
          <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            {user && current ? current.render() : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
