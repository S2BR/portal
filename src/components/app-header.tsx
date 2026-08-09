import { UserMenu } from "@/components/auth/user-menu";
import { Brand } from "@/components/brand";
import { CompanyNavToggle } from "@/components/business/company-nav-toggle";
import { DirectionToggle } from "@/components/dev/direction-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";

/** The authenticated app header — used by the (app) shell and the logged-in social home. */
export function AppHeader() {
  return (
    <header
      className="bg-background/30 sticky top-0 z-10 border-b shadow-[0_10px_28px_-8px_rgba(0,0,0,0.06)]"
      // Explicit, un-composed value: Tailwind v4's backdrop-blur builds the filter from chained CSS
      // vars, which Safari invalidates (dropping the blur). A plain blur() with both prefixes works
      // in Safari and Chrome alike.
      style={{
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="flex h-16 w-full items-center gap-4 px-4 sm:px-6">
        <Brand />
        <CompanyNavToggle />
        <div className="ms-auto flex items-center gap-2">
          <DirectionToggle />
          <LocaleSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
