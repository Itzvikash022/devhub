"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SearchCommand } from "@/components/shared/SearchCommand";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="border-border bg-background/80 flex h-14 items-center justify-between border-b px-6 backdrop-blur-sm">
        {/* Left: title area (rendered by pages via Server Components usually, but slot provided) */}
        <div className="min-w-0 flex-1">
          {title && (
            <div>
              <h1 className={cn("text-foreground truncate text-base font-semibold")}>{title}</h1>
              {subtitle && <p className="text-muted-foreground truncate text-xs">{subtitle}</p>}
            </div>
          )}
        </div>

        {/* Right: actions + search */}
        <div className="flex items-center gap-2">
          {actions}

          <button
            onClick={() => setSearchOpen(true)}
            className={cn(
              "border-border bg-background flex items-center gap-2 rounded-md border px-3 py-1.5",
              "text-muted-foreground transition-subtle text-sm",
              "hover:border-border/80 hover:bg-muted hover:text-foreground"
            )}
            aria-label="Open search (⌘K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden text-xs sm:inline">Search...</span>
            <kbd className="bg-muted text-muted-foreground hidden rounded px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
              ⌘K
            </kbd>
          </button>
        </div>
      </header>

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
