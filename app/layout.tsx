import type { Metadata } from "next";
import { Inter, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_NAME, APP_DESCRIPTION } from "@/constants/app.constants";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "500"],
});

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
      className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable}`}
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
