// ─── Application Routes ───────────────────────────────────────────────────────
export const ROUTES = {
  // Auth
  LOGIN: "/login",
  REGISTER: "/register",

  // Dashboard
  DASHBOARD: "/",

  // Projects
  PROJECTS: "/projects",
  PROJECT: (id: string) => `/projects/${id}`,
  PROJECT_NOTES: (id: string) => `/projects/${id}/notes`,
  PROJECT_DETAILS: (id: string) => `/projects/${id}/details`,
  PROJECT_PROGRESS: (id: string) => `/projects/${id}/progress`,
  PROJECT_PIPELINE: (id: string) => `/projects/${id}/pipeline`,
  PROJECT_IMAGES: (id: string) => `/projects/${id}/images`,
  PROJECT_PASSWORDS: (id: string) => `/projects/${id}/passwords`,
  PROJECT_DOCUMENTS: (id: string) => `/projects/${id}/documents`,
  PROJECT_CALENDAR: (id: string) => `/projects/${id}/calendar`,

  // Global Vault
  PASSWORDS: "/passwords",
  DOCUMENTS: "/documents",

  // Calendar
  CALENDAR: "/calendar",
} as const;

// ─── API Routes ───────────────────────────────────────────────────────────────
export const API_ROUTES = {
  // Auth
  AUTH_LOGIN: "/api/auth/login",
  AUTH_REGISTER: "/api/auth/register",
  AUTH_LOGOUT: "/api/auth/logout",
  AUTH_REFRESH: "/api/auth/refresh",
  AUTH_ME: "/api/auth/me",

  // Projects
  PROJECTS: "/api/projects",
  PROJECT: (id: string) => `/api/projects/${id}`,

  // Notes
  PROJECT_NOTES: (projectId: string) => `/api/projects/${projectId}/notes`,
  NOTE: (id: string) => `/api/notes/${id}`,

  // Tasks
  PROJECT_TASKS: (projectId: string) => `/api/projects/${projectId}/tasks`,
  TASK: (id: string) => `/api/tasks/${id}`,

  // Pipeline
  PROJECT_PIPELINE: (projectId: string) => `/api/projects/${projectId}/pipeline`,
  PIPELINE_ITEM: (id: string) => `/api/pipeline/${id}`,

  // Images
  PROJECT_IMAGES: (projectId: string) => `/api/projects/${projectId}/images`,
  IMAGES_PRESIGN: "/api/images/presign",
  IMAGE: (id: string) => `/api/images/${id}`,

  // Passwords
  PASSWORDS: "/api/passwords",
  PASSWORD: (id: string) => `/api/passwords/${id}`,
  PASSWORD_REVEAL: (id: string) => `/api/passwords/${id}/reveal`,

  // Documents
  DOCUMENTS: "/api/documents",
  DOCUMENTS_PRESIGN: "/api/documents/presign",
  DOCUMENTS_CONFIRM: "/api/documents/confirm",
  DOCUMENT: (id: string) => `/api/documents/${id}`,
  DOCUMENT_DOWNLOAD: (id: string) => `/api/documents/${id}/download`,

  // Calendar
  CALENDAR: "/api/calendar",
  CALENDAR_EVENT: (id: string) => `/api/calendar/${id}`,

  // Project Details
  PROJECT_DETAILS: (projectId: string) => `/api/projects/${projectId}/details`,
} as const;
