import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Minimal centered layout for login and register pages.
 * No sidebar, no header — just a clean full-screen form area.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      {children}
    </div>
  );
}
