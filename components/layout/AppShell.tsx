import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  headerActions?: React.ReactNode;
}

/**
 * AppShell composes the full page layout:
 * - Permanent sidebar (desktop)
 * - Scrollable content area with header
 *
 * Used as the inner layout for (dashboard)/layout.tsx
 */
export function AppShell({
  children,
  userName,
  userEmail,
  headerTitle,
  headerSubtitle,
  headerActions,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — hidden on mobile, permanent on md+ */}
      <div className="hidden md:flex">
        <Sidebar userName={userName} userEmail={userEmail} />
      </div>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header title={headerTitle} subtitle={headerSubtitle} actions={headerActions} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
