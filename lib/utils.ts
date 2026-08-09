import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDisplayUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (url.includes("pub-placeholder.r2.dev")) {
    const key = url.split("pub-placeholder.r2.dev/").pop();
    return `/api/r2-proxy?key=${encodeURIComponent(key || "")}`;
  }
  return url;
}
