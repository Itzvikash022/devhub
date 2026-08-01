import { format, formatDistanceToNow, parseISO, isValid } from "date-fns";

/**
 * Formats a date as a human-readable string.
 * Example: "Jul 31, 2026"
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return format(d, "MMM d, yyyy");
}

/**
 * Formats a date as a relative time string from now.
 * Example: "2 days ago" or "in 3 hours"
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Formats a date in YYYY-MM-DD format for monospace/technical display.
 * Example: "2026-07-31"
 */
export function formatMonoDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return format(d, "yyyy-MM-dd");
}

/**
 * Formats a date as MM-DD for compact sidebar/card display.
 * Example: "07-31"
 */
export function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return format(d, "MM-dd");
}

/**
 * Formats relative time showing direction (past vs future).
 * Example: "in 7 days" or "1 day ago"
 */
export function formatDeadline(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Formats a file size in human-readable format.
 * Example: "1.2 MB", "48 KB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
