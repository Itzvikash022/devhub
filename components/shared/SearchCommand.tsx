"use client";

import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  FolderOpen,
  Calendar,
  KeyRound,
  FileText,
  BookOpen,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes.constants";
import { formatDate } from "@/utils/formatDate";
import { useActiveProject } from "@/components/layout/ActiveProjectContext";

interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProjectSearchResult {
  id: string;
  name: string;
  status: string;
}

interface NoteSearchResult {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
}

interface DocumentSearchResult {
  id: string;
  title: string;
  projectId: string | null;
  projectName: string;
}

interface PasswordSearchResult {
  id: string;
  label: string;
  username: string;
  projectId: string | null;
  projectName: string;
}

interface CalendarEventSearchResult {
  id: string;
  title: string;
  date: string;
  type: string;
  source: string;
  projectId: string | null;
  projectName: string;
}

interface SearchResults {
  projects: ProjectSearchResult[];
  notes: NoteSearchResult[];
  documents: DocumentSearchResult[];
  passwords: PasswordSearchResult[];
  calendarEvents: CalendarEventSearchResult[];
}

const PAGES = [
  { label: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: "Projects", href: ROUTES.PROJECTS, icon: FolderOpen },
  { label: "Calendar", href: ROUTES.CALENDAR, icon: Calendar },
  { label: "Password Vault", href: ROUTES.PASSWORDS, icon: KeyRound },
  { label: "Document Vault", href: ROUTES.DOCUMENTS, icon: FileText },
];

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const router = useRouter();
  const { activeProjectId } = useActiveProject();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function navigate(href: string) {
    router.push(href);
    onOpenChange(false);
  }

  // Clear query and results when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Query search endpoint
  useEffect(() => {
    if (!debouncedQuery) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    const url = `/api/search?q=${encodeURIComponent(debouncedQuery)}${
      activeProjectId ? `&projectId=${activeProjectId}` : ""
    }`;
    fetch(url)
      .then((res) => res.json())
      .then((resJson) => {
        if (resJson.success) {
          setResults(resJson.data);
        } else {
          setResults(null);
        }
      })
      .catch((err) => {
        console.error("Search fetch error:", err);
        setResults(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [debouncedQuery]);

  const hasResults =
    results &&
    (results.projects.length > 0 ||
      results.notes.length > 0 ||
      results.documents.length > 0 ||
      results.passwords.length > 0 ||
      results.calendarEvents.length > 0);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      shouldFilter={false}
      className="w-full sm:max-w-[700px] md:max-w-[750px]"
    >
      <CommandInput
        placeholder="Search pages, projects, or actions..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[350px]">
        {isLoading && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
            <Loader2 className="text-primary h-4 w-4 animate-spin" />
            <span>Searching DevHub...</span>
          </div>
        )}

        {!isLoading && query && !hasResults && (
          <CommandEmpty>No results found matching &ldquo;{query}&rdquo;.</CommandEmpty>
        )}

        {/* Static list when no query */}
        {!query && (
          <>
            <CommandGroup heading="Pages">
              {PAGES.map((page) => {
                const Icon = page.icon;
                return (
                  <CommandItem
                    key={page.href}
                    value={page.label}
                    onSelect={() => navigate(page.href)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {page.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {/* Search Results */}
        {!isLoading && results && (
          <>
            {/* Matching Projects */}
            {results.projects.length > 0 && (
              <CommandGroup heading="Projects">
                {results.projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.name}
                    onSelect={() => navigate(ROUTES.PROJECT_NOTES(project.id) as any)}
                  >
                    <FolderOpen className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                    <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
                      <span className="truncate">{project.name}</span>
                      <span className="shrink-0 rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600">
                        Project
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Matching Notes (Pages) */}
            {results.notes.length > 0 && (
              <CommandGroup heading="Pages (Notes)">
                {results.notes.map((note) => (
                  <CommandItem
                    key={note.id}
                    value={note.title}
                    onSelect={() => navigate(`/projects/${note.projectId}/notes/${note.id}`)}
                  >
                    <BookOpen className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                    <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden font-medium">
                      <span className="truncate">{note.title}</span>
                      <span className="bg-muted/65 text-muted-foreground max-w-[200px] shrink-0 truncate rounded px-1.5 py-0.5 text-[10px]">
                        Notes • {note.projectName}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Matching Documents */}
            {results.documents.length > 0 && (
              <CommandGroup heading="Documents">
                {results.documents.map((doc) => (
                  <CommandItem
                    key={doc.id}
                    value={doc.title}
                    onSelect={() => {
                      const baseRoute = doc.projectId
                        ? ROUTES.PROJECT_DOCUMENTS(doc.projectId)
                        : ROUTES.DOCUMENTS;
                      navigate(`${baseRoute}?search=${encodeURIComponent(doc.title)}` as any);
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                    <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden font-medium">
                      <span className="truncate">{doc.title}</span>
                      <span className="bg-muted/65 text-muted-foreground max-w-[200px] shrink-0 truncate rounded px-1.5 py-0.5 text-[10px]">
                        Document {doc.projectName ? `• ${doc.projectName}` : ""}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Matching Passwords */}
            {results.passwords.length > 0 && (
              <CommandGroup heading="Passwords">
                {results.passwords.map((pw) => (
                  <CommandItem
                    key={pw.id}
                    value={pw.label}
                    onSelect={() => {
                      const baseRoute = pw.projectId
                        ? ROUTES.PROJECT_PASSWORDS(pw.projectId)
                        : ROUTES.PASSWORDS;
                      navigate(`${baseRoute}?search=${encodeURIComponent(pw.label)}` as any);
                    }}
                  >
                    <KeyRound className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                    <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden font-medium">
                      <span className="truncate">
                        {pw.label}{" "}
                        <span className="text-muted-foreground/60 text-xs font-normal">
                          ({pw.username})
                        </span>
                      </span>
                      <span className="bg-muted/65 text-muted-foreground max-w-[200px] shrink-0 truncate rounded px-1.5 py-0.5 text-[10px]">
                        Password {pw.projectName ? `• ${pw.projectName}` : ""}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Matching Calendar Events */}
            {results.calendarEvents.length > 0 && (
              <CommandGroup heading="Calendar Events">
                {results.calendarEvents.map((event) => {
                  const dateStr = event.date.split("T")[0];
                  const baseRoute = event.projectId
                    ? ROUTES.PROJECT_CALENDAR(event.projectId)
                    : ROUTES.CALENDAR;
                  const targetRoute = `${baseRoute}?date=${dateStr}&eventId=${event.id}`;
                  const isTaskEvent = event.source === "task";

                  return (
                    <CommandItem
                      key={event.id}
                      value={event.title}
                      onSelect={() => navigate(targetRoute as any)}
                    >
                      <Calendar className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                      <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden font-medium">
                        <span className="truncate">{event.title}</span>
                        <span className="bg-muted/65 text-muted-foreground max-w-[250px] shrink-0 truncate rounded px-1.5 py-0.5 text-[10px]">
                          {isTaskEvent ? "Task Deadline" : "Event"}
                          {event.projectName ? ` • ${event.projectName}` : ""} (
                          {formatDate(event.date)})
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
