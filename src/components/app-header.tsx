import { UserMenu } from "@/components/auth/user-menu";
import { Brand } from "@/components/brand";
import { DirectionToggle } from "@/components/dev/direction-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";

/** The authenticated app header — used by the (app) shell and the logged-in social home. */
export function AppHeader() {
  return (
    <header className="bg-background/55 fixed inset-x-0 top-0 z-40 border-b shadow-[0_10px_28px_-8px_rgba(0,0,0,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Brand />
        <div className="ms-auto flex items-center gap-2">
          <DirectionToggle />
          <LocaleSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
