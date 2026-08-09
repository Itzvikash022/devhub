import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDisplayUrl(url: string | undefined | null): string {
  if (!url) return "";
  // Already a data URL (base64 inline thumbnail) — return as-is
  if (url.startsWith("data:")) return url;
  // Proxy any R2 public URL through the backend to avoid CORS/auth issues in production
  // Matches both placeholder (pub-placeholder.r2.dev) and real R2 public domains (*.r2.dev or custom)
  const r2Patterns = [
    "pub-placeholder.r2.dev",
    ".r2.dev/",
    ".r2.cloudflarestorage.com/",
  ];
  if (r2Patterns.some((p) => url.includes(p))) {
    // Extract the key: everything after the first slash following the host
    const withoutProtocol = url.replace(/^https?:\/\//, "");
    const key = withoutProtocol.split("/").slice(1).join("/");
    return `/api/r2-proxy?key=${encodeURIComponent(key)}`;
  }
  return url;
}
