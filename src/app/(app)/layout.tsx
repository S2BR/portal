import { AppShell } from "@/components/app-shell";
import { SessionNotice } from "@/components/auth/session-notice";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppShell>
      <SessionNotice />
      {children}
    </AppShell>
  );
}
