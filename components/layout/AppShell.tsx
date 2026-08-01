import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { PageHeaderProvider } from "./PageHeaderContext";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}

/**
 * AppShell composes the full page layout:
 * - Permanent sidebar (desktop)
 * - Scrollable content area with header
 *
 * Title/subtitle/actions in the header are set by each page via <SetPageHeader>.
 */
export function AppShell({ children, userName, userEmail }: AppShellProps) {
  return (
    <PageHeaderProvider>
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--paper)" }}>
        {/* Sidebar — hidden on mobile, permanent on md+ */}
        <div className="hidden md:flex">
          <Sidebar userName={userName} userEmail={userEmail} />
        </div>

        {/* Main content area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </PageHeaderProvider>
  );
}
