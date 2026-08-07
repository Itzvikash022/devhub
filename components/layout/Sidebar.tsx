"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderOpen,
  Calendar,
  KeyRound,
  FileText,
  Image as ImageIcon,
  FileCode,
  Braces,
  PenTool,
  ChevronRight,
  ChevronLeft,
  Code2,
  NotebookPen,
  Info,
  CheckSquare,
  GitBranch,
  Globe,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes.constants";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useProjectsList } from "@/hooks/useProjects";
import { useActiveProject } from "./ActiveProjectContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface SidebarProject {
  id: string;
  name: string;
  status: "active" | "on-hold" | "archived";
}

interface SidebarProps {
  userName?: string;
  userEmail?: string;
}

// ─── Global mode nav items ─────────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: "Projects", href: ROUTES.PROJECTS, icon: FolderOpen },
  { label: "Calendar", href: ROUTES.CALENDAR, icon: Calendar },
];

const VAULT_ITEMS: NavItem[] = [
  { label: "Passwords", href: ROUTES.PASSWORDS, icon: KeyRound },
  { label: "Documents", href: ROUTES.DOCUMENTS, icon: FileText },
  { label: "Images", href: ROUTES.IMAGES, icon: ImageIcon },
];

const TOOLS_ITEMS: NavItem[] = [
  { label: "Markdown Preview", href: ROUTES.TOOLS_MARKDOWN, icon: FileCode },
  { label: "HTML Preview", href: ROUTES.TOOLS_HTML, icon: Code2 },
  { label: "JSON Formatter", href: ROUTES.TOOLS_JSON, icon: Braces },
  { label: "Whiteboard", href: ROUTES.TOOLS_WHITEBOARD, icon: PenTool },
];

// ─── Project mode nav builder ──────────────────────────────────────────────────
function getProjectNavItems(projectId: string): NavItem[] {
  return [
    { label: "Notes", href: ROUTES.PROJECT_NOTES(projectId), icon: NotebookPen },
    { label: "Details", href: ROUTES.PROJECT_DETAILS(projectId), icon: Info },
    { label: "Progress", href: ROUTES.PROJECT_PROGRESS(projectId), icon: CheckSquare },
    { label: "Pipeline", href: ROUTES.PROJECT_PIPELINE(projectId), icon: GitBranch },
    { label: "Images", href: ROUTES.PROJECT_IMAGES(projectId), icon: ImageIcon },
    { label: "Passwords", href: ROUTES.PROJECT_PASSWORDS(projectId), icon: KeyRound },
    { label: "Documents", href: ROUTES.PROJECT_DOCUMENTS(projectId), icon: FileText },
    { label: "Calendar", href: ROUTES.PROJECT_CALENDAR(projectId), icon: Calendar },
  ];
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-400",
  "on-hold": "bg-amber-400",
  archived: "bg-zinc-500",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({ userName = "User", userEmail = "" }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: dbProjects = [] } = useProjectsList();
  const { activeProjectId, activeProject, clearActiveProject } = useActiveProject();

  const activeProjects = [...dbProjects]
    .filter((p) => p.status !== "archived")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((p) => ({
      id: p._id,
      name: p.name,
      status: p.status as SidebarProject["status"],
    }));

  function isActive(href: string): boolean {
    if (href === ROUTES.DASHBOARD) return pathname === href;
    return pathname.startsWith(href);
  }

  // Project mode nav items
  const projectNavItems = activeProjectId ? getProjectNavItems(activeProjectId) : [];

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r transition-all duration-200",
        "border-[oklch(0.22_0.008_240)] bg-[oklch(0.145_0.008_240)]",
        collapsed ? "w-[56px]" : "w-[200px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-3">
        <Link href={ROUTES.DASHBOARD} className="flex min-w-0 items-center gap-2">
          <div className="bg-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
            <Code2 className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="truncate font-mono text-sm font-medium text-white">DevHub</span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[oklch(0.5_0.008_240)] transition-colors hover:text-[oklch(0.7_0.005_240)]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <ScrollArea className="flex-1">
        {activeProjectId && activeProject ? (
          // ── PROJECT MODE ────────────────────────────────────────────────────
          <div className="space-y-1 px-2 py-2">
            {/* Back to Global button */}
            <div className="mb-2">
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger className="block w-full">
                    <button
                      onClick={clearActiveProject}
                      className="flex w-full items-center justify-center rounded-md px-2 py-1.5 text-[oklch(0.5_0.008_240)] transition-colors hover:bg-[oklch(0.22_0.01_240)] hover:text-[oklch(0.75_0.005_240)]"
                    >
                      <Globe className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Back to Global</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={clearActiveProject}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[oklch(0.5_0.008_240)] transition-colors hover:bg-[oklch(0.22_0.01_240)] hover:text-[oklch(0.75_0.005_240)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Back to Global</span>
                </button>
              )}
            </div>

            {/* Project name header */}
            {!collapsed && (
              <div className="mb-2 px-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      STATUS_COLORS[activeProject.status] ?? "bg-zinc-500"
                    )}
                  />
                  <p className="truncate text-[11px] font-semibold text-[oklch(0.75_0.005_240)]">
                    {activeProject.name}
                  </p>
                </div>
                <p className="mt-0.5 px-3 text-[9px] font-medium uppercase tracking-widest text-[oklch(0.35_0.005_240)]">
                  Project Workspace
                </p>
              </div>
            )}

            {/* Project nav items */}
            <nav className="space-y-0.5">
              {projectNavItems.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  active={pathname.startsWith(item.href)}
                  collapsed={collapsed}
                />
              ))}
            </nav>

            {/* Divider */}
            <Separator className="my-2 bg-[oklch(0.22_0.008_240)]" />

            {/* Tools section (always available) */}
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-medium tracking-widest text-[oklch(0.4_0.005_240)] uppercase">
                Tools
              </p>
            )}
            <nav className="space-y-0.5">
              {TOOLS_ITEMS.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                />
              ))}
            </nav>
          </div>
        ) : (
          // ── GLOBAL MODE (existing layout unchanged) ─────────────────────────
          <div className="space-y-4 px-2 py-2">
            {/* Navigation */}
            <section>
              {!collapsed && (
                <p className="mb-1 px-2 text-[10px] font-medium tracking-widest text-[oklch(0.4_0.005_240)] uppercase">
                  Navigation
                </p>
              )}
              <nav className="space-y-0.5">
                {NAV_ITEMS.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </nav>
            </section>

            {/* Recently Updated Projects */}
            <section>
              {!collapsed && (
                <div className="mb-1 flex items-center justify-between px-2">
                  <Link
                    href={ROUTES.PROJECTS}
                    className="flex items-center gap-1 text-[10px] font-medium tracking-widest text-[oklch(0.4_0.005_240)] uppercase hover:text-[oklch(0.7_0.005_240)] transition-colors"
                    title="View all projects"
                  >
                    Recently Updated
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
              <nav className="space-y-0.5">
                {activeProjects.slice(0, 5).map((project) => (
                  <SidebarProjectItem
                    key={project.id}
                    project={project}
                    active={pathname.startsWith(ROUTES.PROJECT(project.id))}
                    collapsed={collapsed}
                  />
                ))}
              </nav>
            </section>

            {/* Vault */}
            <section>
              {!collapsed && (
                <p className="mb-1 px-2 text-[10px] font-medium tracking-widest text-[oklch(0.4_0.005_240)] uppercase">
                  Vault
                </p>
              )}
              <nav className="space-y-0.5">
                {VAULT_ITEMS.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </nav>
            </section>

            {/* Tools */}
            <section>
              {!collapsed && (
                <p className="mb-1 px-2 text-[10px] font-medium tracking-widest text-[oklch(0.4_0.005_240)] uppercase">
                  Tools
                </p>
              )}
              <nav className="space-y-0.5">
                {TOOLS_ITEMS.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </nav>
            </section>
          </div>
        )}
      </ScrollArea>

      {/* User profile */}
      <div className="border-t border-[oklch(0.22_0.008_240)] p-2">
        <Separator className="mb-2 bg-[oklch(0.22_0.008_240)]" />
        <ProfileDropdown userName={userName} userEmail={userEmail} collapsed={collapsed} />
      </div>
    </aside>
  );
}

// ─── Profile Dropdown ─────────────────────────────────────────────────────────

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { useLogout } from "@/hooks/useAuth";

function ProfileDropdown({
  userName,
  userEmail,
  collapsed,
}: {
  userName: string;
  userEmail: string;
  collapsed: boolean;
}) {
  const { mutate: logout } = useLogout();
  const initials = getInitials(userName);

  const triggerEl = collapsed ? (
    <div className="flex w-full cursor-pointer justify-center">
      <Avatar className="h-7 w-7">
        <AvatarFallback className="bg-primary text-[10px] font-medium text-white">
          {initials}
        </AvatarFallback>
      </Avatar>
    </div>
  ) : (
    <button className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors outline-none hover:bg-[oklch(0.22_0.01_240)]">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="bg-primary text-[10px] font-medium text-white">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[oklch(0.85_0.005_240)]">{userName}</p>
        <p className="truncate text-[10px] text-[oklch(0.45_0.005_240)]">dev</p>
      </div>
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={triggerEl} />
      <DropdownMenuContent
        side={collapsed ? "right" : "top"}
        align="end"
        className="bg-card border-border w-48 border"
      >
        {!collapsed && (
          <>
            <div className="px-2 py-1.5 text-xs">
              <p className="text-foreground truncate font-semibold">{userName}</p>
              <p className="text-muted-foreground truncate">{userEmail}</p>
            </div>
            <DropdownMenuSeparator className="bg-border" />
          </>
        )}
        <DropdownMenuItem
          onClick={() => logout()}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs"
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────

function SidebarNavItem({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const linkEl = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary text-white"
          : "text-[oklch(0.65_0.005_240)] hover:bg-[oklch(0.22_0.01_240)] hover:text-[oklch(0.85_0.005_240)]",
        collapsed && "justify-center"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger className="block w-full">{linkEl}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return linkEl;
}

// ─── Project Item (global mode sidebar shortcut) ──────────────────────────────

function SidebarProjectItem({
  project,
  active,
  collapsed,
}: {
  project: SidebarProject;
  active: boolean;
  collapsed: boolean;
}) {
  const statusDot = (
    <span
      className={cn(
        "h-1.5 w-1.5 shrink-0 rounded-full",
        STATUS_COLORS[project.status] ?? "bg-zinc-500"
      )}
    />
  );

  const linkEl = (
    <Link
      href={ROUTES.PROJECT(project.id)}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-[oklch(0.22_0.01_240)] text-[oklch(0.9_0.005_240)]"
          : "text-[oklch(0.6_0.005_240)] hover:bg-[oklch(0.2_0.01_240)] hover:text-[oklch(0.8_0.005_240)]",
        collapsed && "justify-center"
      )}
    >
      {statusDot}
      {!collapsed && <span className="truncate">{project.name}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger className="block w-full">{linkEl}</TooltipTrigger>
        <TooltipContent side="right">{project.name}</TooltipContent>
      </Tooltip>
    );
  }

  return linkEl;
}
