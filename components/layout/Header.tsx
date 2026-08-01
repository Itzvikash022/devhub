"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { SearchCommand } from "@/components/shared/SearchCommand";
import { usePageHeader } from "./PageHeaderContext";

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { header } = usePageHeader();

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
      <header
        className="flex h-14 shrink-0 items-center gap-4 border-b px-5"
        style={{ borderColor: "var(--line)", backgroundColor: "var(--paper)" }}
      >
        {/* Left: title + subtitle from context */}
        <div className="min-w-0 flex-1">
          {header.title && (
            <h1
              className="truncate font-heading leading-tight"
              style={{ fontSize: "18px", fontWeight: 500, color: "var(--text)" }}
            >
              {header.title}
            </h1>
          )}
          {header.subtitle && (
            <p
              className="truncate font-mono"
              style={{ fontSize: "11px", color: "var(--text-dim)" }}
            >
              {header.subtitle}
            </p>
          )}
        </div>

        {/* Right: page actions + search */}
        <div className="flex shrink-0 items-center gap-3">
          {header.actions}

          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-md border px-3 py-1.5 transition-colors"
            style={{
              borderColor: "var(--line)",
              backgroundColor: "var(--paper-raised)",
              color: "var(--text-dim)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-color)";
              (e.currentTarget as HTMLElement).style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--line)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-dim)";
            }}
            aria-label="Open search (⌘K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden text-xs sm:inline font-inter">Search...</span>
            <kbd
              className="hidden rounded px-1 py-0.5 font-mono text-[10px] sm:inline-block"
              style={{
                backgroundColor: "var(--paper)",
                borderColor: "var(--line)",
                border: "1px solid var(--line)",
                color: "var(--text-dim)",
              }}
            >
              ⌘K
            </kbd>
          </button>
        </div>
      </header>

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
