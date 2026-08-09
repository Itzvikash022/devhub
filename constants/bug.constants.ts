// ─── Bug Constants ────────────────────────────────────────────────────────────

export const BUG_SEVERITIES = ["low", "medium", "high", "critical"] as const;

export const BUG_AREAS = [
  "Frontend / UI",
  "Backend / API",
  "Database",
  "DevOps / Infrastructure",
  "Authentication / Security",
  "Notes Workspace",
  "Progress Tracker",
  "Password / Document Vault",
  "Calendar",
  "Other",
] as const;
