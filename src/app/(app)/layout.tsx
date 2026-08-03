import { CurrentUserProvider } from "@/components/auth/current-user";
import { UserMenu } from "@/components/auth/user-menu";
import { Brand } from "@/components/brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CurrentUserProvider>
      <div className="flex min-h-full flex-col">
        <header className="bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
            <Brand />
            <div className="ml-auto flex items-center gap-2">
              <LocaleSwitcher />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
          {children}
        </main>
      </div>
    </CurrentUserProvider>
  );
}
