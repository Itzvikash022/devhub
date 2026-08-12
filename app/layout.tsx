import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_NAME, APP_DESCRIPTION } from "@/constants/app.constants";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s — ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  robots: {
    index: false, // Private app — do not index
    follow: false,
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

import { Providers } from "@/app/providers";

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <Providers>
          <TooltipProvider delay={300}>{children}</TooltipProvider>
        </Providers>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: "var(--font-inter)",
              fontSize: "0.875rem",
            },
          }}
        />
      </body>
    </html>
  );
}
