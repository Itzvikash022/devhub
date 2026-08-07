"use client";

import { Search, Globe, FolderOpen, ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SearchCommand } from "@/components/shared/SearchCommand";
import { usePageHeader } from "./PageHeaderContext";
import { useActiveProject } from "./ActiveProjectContext";
import { cn } from "@/lib/utils";

// ─── Project Picker ───────────────────────────────────────────────────────────

function ProjectPicker() {
  const { activeProject, activeProjectId, projects, setActiveProject, clearActiveProject } =
    useActiveProject();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isProjectMode = !!activeProjectId;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      {/* Trigger button */}
      <div
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        tabIndex={0}
        role="button"
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-all outline-none cursor-pointer select-none",
          isProjectMode
            ? "border-primary/40 bg-primary/8 text-primary"
            : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30"
        )}
        style={{ maxWidth: 200 }}
        aria-label="Select working project"
      >
        {isProjectMode ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Globe className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="truncate max-w-[110px]">
          {isProjectMode ? activeProject?.name : "Global"}
        </span>
        {isProjectMode ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearActiveProject();
              setOpen(false);
            }}
            className="ml-0.5 rounded p-0.5 hover:bg-primary/20 transition-colors"
            aria-label="Exit project mode"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1.5 min-w-[220px] rounded-lg border border-border bg-card shadow-lg overflow-hidden"
          style={{ maxHeight: 320 }}
        >
          {/* Global option */}
          <button
            onClick={() => {
              clearActiveProject();
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2.5 text-xs transition-colors text-left",
              !activeProjectId
                ? "bg-primary/8 text-primary font-semibold"
                : "text-foreground hover:bg-muted/60"
            )}
          >
            <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">Global</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Show all data across projects</p>
            </div>
            {!activeProjectId && (
              <span className="ml-auto text-[9px] font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                active
              </span>
            )}
          </button>

          {/* Divider */}
          {projects.length > 0 && (
            <div className="border-t border-border/50 mx-2 my-1" />
          )}

          {/* Project list */}
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {projects.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                No projects yet
              </p>
            ) : (
              projects.map((p) => (
                <button
                  key={p._id}
                  onClick={() => {
                    setActiveProject(p._id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left",
                    activeProjectId === p._id
                      ? "bg-primary/8 text-primary font-semibold"
                      : "text-foreground hover:bg-muted/60"
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      p.status === "active"
                        ? "bg-emerald-400"
                        : p.status === "on-hold"
                        ? "bg-amber-400"
                        : "bg-zinc-500"
                    )}
                  />
                  <span className="truncate flex-1">{p.name}</span>
                  {activeProjectId === p._id && (
                    <span className="ml-auto text-[9px] font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded">
                      active
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

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
        className="flex h-14 shrink-0 items-center gap-3 border-b px-5"
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

        {/* Right: project picker + page actions + search */}
        <div className="flex shrink-0 items-center gap-2.5">
          {/* Project Picker */}
          <ProjectPicker />

          {/* Page-level actions injected by each page */}
          {header.actions}

          {/* Search */}
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
