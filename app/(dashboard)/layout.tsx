import { AppShell } from "@/components/layout/AppShell";
import { requireSession } from "@/lib/auth/session";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Main dashboard layout.
 * Wraps all authenticated pages in the AppShell (Sidebar + Header + content area).
 *
 * In Phase 2+, projects will be fetched server-side here and passed to AppShell.
 */
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await requireSession();

  return (
    <AppShell userName={session.name} userEmail={session.email}>
      {children}
    </AppShell>
  );
}
