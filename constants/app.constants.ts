// ─── Application Constants ────────────────────────────────────────────────────

// JWT
export const JWT_ACCESS_EXPIRES_IN = "15m";
export const JWT_REFRESH_EXPIRES_IN = "30d";

// Cookie names
export const ACCESS_TOKEN_COOKIE = "devhub_access";
export const REFRESH_TOKEN_COOKIE = "devhub_refresh";

// File upload limits
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
] as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Presigned URL expiry
export const PRESIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

// App metadata
export const APP_NAME = "DevHub";
export const APP_DESCRIPTION = "Personal developer project management workspace";
