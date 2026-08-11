# DevHub — Project Manager

A full-stack project management platform built with **Next.js 16**, **MongoDB**, and **Cloudflare R2**. DevHub gives teams a unified workspace covering task pipelines, rich notes, password vaults, document vaults, image galleries, developer utility tools, and a shared whiteboard — all under one roof.

---

## Features

| Module             | Description                                                             |
| ------------------ | ----------------------------------------------------------------------- |
| **Projects**       | Create workspaces with status tracking, dynamic tab titles & metadata   |
| **Pipeline**       | Kanban-style task board with status, priority, assignee, and due dates  |
| **Progress**       | Table view of all tasks with full-width expanded rows and live comments |
| **Notes**          | Notion-style block editor with full-page, per-project note pages        |
| **Calendar**       | Monthly event calendar with manual events and automatic task deadlines  |
| **Password Vault** | AES-256-GCM encrypted credential storage, per-project or global         |
| **Document Vault** | Secure file uploads via server-side Cloudflare R2 streaming API         |
| **Image Vault**    | Global and per-project image gallery with encrypted signed URL access   |
| **Developer Tools**| Markdown previewer, HTML sandbox, JSON formatter, and whiteboard canvas |
| **Whiteboard**     | Excalidraw-like vector drawing canvas with PNG & PDF export             |
| **Dashboard**      | Unified activity feed, upcoming deadlines, and workspace shortcuts      |
| **Global Search**  | Instant search across projects, notes, documents, passwords, and events |

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, `proxy.ts`)
- **Language**: TypeScript 5
- **Database**: MongoDB via [Mongoose 9](https://mongoosejs.com/)
- **Auth**: JWT (access + refresh token pair, HTTP-only cookies, silent refresh)
- **Encryption**: AES-256-GCM for password vault secrets
- **File Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/) via AWS S3 SDK (presigned upload/download + server streaming API)
- **UI**: [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) + [Tailwind CSS v4](https://tailwindcss.com/)
- **Editor**: [BlockNote](https://www.blocknotejs.org/) (Notion-style rich text)
- **Diagrams & Preview**: [Mermaid.js](https://mermaid.js.org/) + [Marked](https://marked.js.org/)
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF)
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: TanStack Query v5
- **Animations**: Framer Motion
- **Toasts**: Sonner
- **Linting/Formatting**: ESLint 9 + Prettier + Husky (pre-commit)

---

## Project Structure

```
devhub/
├── app/
│   ├── (auth)/              # Login & register pages
│   ├── (dashboard)/         # All protected app pages
│   │   ├── calendar/        # Global calendar
│   │   ├── documents/       # Global document vault
│   │   ├── images/          # Global image vault
│   │   ├── passwords/       # Global password vault
│   │   ├── projects/        # Projects list + per-project workspaces
│   │   │   └── [id]/        # Pipeline, Notes, Progress, Details, Images, Docs, Passwords
│   │   ├── tools/           # Markdown, HTML, JSON, and Whiteboard pages
│   │   └── layout.tsx       # Sidebar layout with global search
│   └── api/                 # All API routes (REST)
│       ├── auth/            # Login, logout, register, refresh, me
│       ├── calendar/        # Calendar event CRUD
│       ├── dashboard/       # Aggregated dashboard data
│       ├── documents/       # Document vault + R2 presign/confirm/upload
│       ├── images/          # Image vault + R2 presign/confirm/upload
│       ├── notes/           # Note page CRUD
│       ├── passwords/       # Password vault + AES reveal
│       ├── pipeline/        # Kanban column CRUD
│       ├── projects/        # Project CRUD + per-project sub-routes
│       ├── search/          # Global cross-collection search
│       └── tasks/           # Task CRUD with calendar sync
├── components/
│   ├── dialogs/             # All form modals (TaskDialog, MoveSectionsDialog, etc.)
│   ├── editor/              # BlockNote rich text editor wrapper
│   ├── layout/              # Sidebar and navigation components
│   ├── shared/              # Page-level view components
│   └── ui/                  # shadcn/ui primitives
├── hooks/                   # TanStack Query hooks per domain
├── lib/                     # Auth session, DB connection, response helpers
├── models/                  # Mongoose schemas
├── proxy.ts                 # Next.js 16 authentication & route protection proxy
├── repositories/            # Data access layer (repository pattern)
├── schemas/                 # Zod validation schemas
├── services/                # Business logic layer
├── types/                   # Shared TypeScript types
└── utils/                   # Utility functions
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster (or local MongoDB instance)
- A Cloudflare R2 bucket with public access enabled

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd "Project Manager V2/devhub"
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/devhub

# JWT — generate with: openssl rand -base64 64
JWT_ACCESS_SECRET=your-access-token-secret
JWT_REFRESH_SECRET=your-refresh-token-secret

# AES-256 Encryption — generate with: openssl rand -hex 32
ENCRYPTION_KEY=your-64-hex-character-key

# Cloudflare R2
CLOUDFLARE_R2_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-access-key
CLOUDFLARE_R2_BUCKET_NAME=devhub
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxx.r2.dev
```

### 4. Run in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production

```bash
npm run build
npm run start
```

---

## Available Scripts

| Command                | Description                             |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Start development server with Turbopack |
| `npm run build`        | Build optimized production bundle       |
| `npm run start`        | Start the production server             |
| `npm run lint`         | Run ESLint across the codebase          |
| `npm run format`       | Auto-format all files with Prettier     |
| `npm run format:check` | Check formatting without writing        |

---

## Architecture Overview

### Authentication & Proxy

JWT-based auth using a short-lived **access token** and a long-lived **refresh token**, both stored as HTTP-only cookies. Next.js 16 `proxy.ts` validates access on every protected route and automatically performs silent token refreshes when the access token expires.

### Data Layer

Follows a strict **Repository → Service → API Route** pattern:

- **Repositories** handle raw MongoDB queries
- **Services** enforce business logic, ownership verification, and auto-touch activity timestamps
- **API Routes** handle HTTP parsing, validation, and response formatting

### File Storage (R2)

Uploads support both direct presigned URLs and a high-performance **server streaming API**: the client posts `FormData` files to `/api/documents/upload` or `/api/projects/[id]/images/upload`, which streams them to R2 via Node.js `S3Client`, eliminating browser CORS preflight blocks.

### Password Security

Password vault secrets are encrypted with **AES-256-GCM** server-side before storage. The raw secret is never returned in list responses — it is only decrypted on an explicit "reveal" request and never persisted to the client.

### Calendar Sync

When a task with a due date is created or updated, the service layer automatically **upserts a linked `CalendarEvent`** record. Marking a task as done or removing its due date cleans up the calendar entry automatically.

---

## Environment Variables Reference

| Variable                          | Required | Description                            |
| --------------------------------- | -------- | -------------------------------------- |
| `NEXT_PUBLIC_APP_URL`             | Yes      | Public base URL of the app             |
| `MONGODB_URI`                     | Yes      | MongoDB connection string              |
| `JWT_ACCESS_SECRET`               | Yes      | Secret for signing access tokens       |
| `JWT_REFRESH_SECRET`              | Yes      | Secret for signing refresh tokens      |
| `ENCRYPTION_KEY`                  | Yes      | 64-char hex key for AES-256 encryption |
| `CLOUDFLARE_R2_ACCOUNT_ID`        | Yes      | Cloudflare account ID                  |
| `CLOUDFLARE_R2_ACCESS_KEY_ID`     | Yes      | R2 access key                          |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Yes      | R2 secret key                          |
| `CLOUDFLARE_R2_BUCKET_NAME`       | Yes      | R2 bucket name                         |
| `CLOUDFLARE_R2_PUBLIC_URL`        | Yes      | Public R2 bucket URL for serving files |

---

## Patch Notes

### v2.6.0 — Popping Sidebar Details, Clickable Sorting & UI/UX Enhancements
- Replaced inline expandable row details with a popping right sidebar Sheet.
- Added instant inline editing for Description and Area / Module with Save/Cancel buttons inside the sidebar.
- Added column header clicking to sort table tasks, with interactive sort direction indicators.
- Added a toggle button for "Assigned to me" in place of the sorting dropdown.
- Enabled double-click selection of images inside the Vault Selector modal.
- Restructured TaskDialog: removed comments feed and laid out other fields into left/right columns.
- Auto-select today's date as the default due date when creating new tracker items.
- Restructured Settings: converted invitations to Settings, relocated Settings to the bottom of the sidebar, and added project settings with owner-only project deletion.

### v2.5.2 — Project Deletion Security
- Restricted project modification buttons to owners and required password confirmation to delete workspaces.

### v2.5.1 — Collaboration Bug Fixes
- Fixed Mongoose schema registration crashes across all APIs.
- Fixed pending invitations query returning empty lists.
- Fixed "Forbidden" errors when accepting invitations or sharing existing passwords.
- Hid project "Share" button for non-owner members.

### v2.5.0 — Multi-User Collaboration
- Added project sharing via email invitations.
- Added task assignment and "Assigned to me" Progress tracker filter.
- Added creator attribution ("Created by", "Uploaded by") to all resources.
- Added password sharing toggles.

### v2.4.3 — New Task Status: "Ready for Test"
- Added **"Ready for Test"** as a task status across validation schemas, models, filters, task dialogs, and UI badges.

### v2.4.2 — Progress Tracker Context Menu
- Added right-click context menu on task rows with **Copy Task** and **Mark as Done** quick actions.

### v2.4.1 — Image Vault Production Fixes
- Fixed Cloudflare R2 image URL proxying and thumbnail rendering in the deployed environment.
- Fixed upload queue race condition and made CORS setup non-blocking.

### v2.4.0 — Unified Progress Tracker & Bug Infrastructure
- Unified Tasks and Bugs into a single Progress board with custom ID badges (`T-xxxx` / `B-xxxx`) and separate creation triggers.
- Added R2 media proxy, automated daily cleanup cron, immediate resource deletion, screenshot zoom previews, and "Select from Vault" picker.

### v2.3.0 — Sidebar Reorganization & Workspace Scoping
- Reorganized project sidebar layout matching global mode.
- Scoped dashboard activity, search, and vaults strictly to active working project.
- Fixed header switcher hydration mismatch and button nesting warnings.

### v2.2.0 — Active Project Context, Task Export & Password Import/Export
- Introduced Working Project dropdown in header to filter all vaults by project.
- Added selective task export with interactive Export Preview modal.
- Added password CSV import/export table editor, password-protected export, and copy-on-click credentials.
- Added parallel image upload queue, WebP thumbnail compression, and notes editor auto-save.

### v2.1.0 — Progress Tracker Redesign & Next.js 16 Auth Proxy
- Redesigned Progress Tracker table layout with full-width expanded view and 2-column task dialog.
- Added native drag-and-drop field reordering inside custom sections.
- Migrated auth middleware to Next.js 16 `proxy.ts` convention and added dynamic browser tab titles.

### v2.0.0 — Global Image Vault & Developer Tools Suite
- Promoted Image Vault to a top-level global route with project filtering.
- Built Developer Tools suite: Markdown/Mermaid live previewer, HTML/CSS sandbox, JSON formatter/validator, and Whiteboard canvas with PNG/PDF export.
- Cleaned up toolbar actions, notes editor transactions, and masonry layout engine.

---

## License

Private — all rights reserved.
