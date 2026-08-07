"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useProjectsList } from "@/hooks/useProjects";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectData {
  _id: string;
  name: string;
  status: "active" | "on-hold" | "archived";
}

interface ActiveProjectContextValue {
  /** null = Global mode */
  activeProjectId: string | null;
  /** Full project record for the active project, or null in Global mode */
  activeProject: ProjectData | null;
  /** All non-archived projects available to select */
  projects: ProjectData[];
  /** Set a specific project as active */
  setActiveProject: (id: string | null) => void;
  /** Clear context → revert to Global mode */
  clearActiveProject: () => void;
}

const STORAGE_KEY = "devhub_active_project";

const ActiveProjectContext = createContext<ActiveProjectContextValue>({
  activeProjectId: null,
  activeProject: null,
  projects: [],
  setActiveProject: () => {},
  clearActiveProject: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const { data: rawProjects = [] } = useProjectsList();
  const router = useRouter();

  const projects = useMemo(
    () =>
      rawProjects
        .filter((p) => p.status !== "archived")
        .map((p) => ({ _id: p._id, name: p.name, status: p.status as ProjectData["status"] })),
    [rawProjects]
  );

  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setActiveProjectIdState(saved);
    }
  }, []);

  // When projects load, validate the persisted id still exists
  useEffect(() => {
    if (projects.length === 0 || !activeProjectId) return;
    if (!projects.find((p) => p._id === activeProjectId)) {
      // Project was deleted or archived — clear stale context
      localStorage.removeItem(STORAGE_KEY);
      setActiveProjectIdState(null);
    }
  }, [projects, activeProjectId]);

  const setActiveProject = useCallback((id: string | null) => {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setActiveProjectIdState(id);
    router.push("/");
  }, [router]);

  const clearActiveProject = useCallback(() => setActiveProject(null), [setActiveProject]);

  const activeProject = useMemo(
    () => (activeProjectId ? (projects.find((p) => p._id === activeProjectId) ?? null) : null),
    [activeProjectId, projects]
  );

  return (
    <ActiveProjectContext.Provider
      value={{ activeProjectId, activeProject, projects, setActiveProject, clearActiveProject }}
    >
      {children}
    </ActiveProjectContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useActiveProject(): ActiveProjectContextValue {
  return useContext(ActiveProjectContext);
}
