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

### v2.2.0 — Active Project Context (Site Flow), Task Selective Export, Password Import/Export Table, and Notes Editor Optimizations
- **Active Project Context (Working Project Picker) (In Testing Mode)**: Introduced a "Working Project" dropdown in the header to filter the Password, Document, Calendar, and Image vaults to specific projects. In Project Mode, the navigation sidebar dynamically replaces the global view with a complete project-specific workspace sidebar (Notes, Details, Progress, Pipeline, Images, Passwords, Documents, Calendar) and adds a "Back to Global" toggle.
- **Task Selective Export & Export Preview**: Repurposed task checkboxes for selective export scoping. Created a floating bulk actions toolbar and a full-height interactive Export Preview modal supporting copying formatted tasks as plain-text or Markdown to the clipboard instantly.
- **Password CSV Import & Interactive Table Editor**: Integrated a spreadsheet CSV parser and an interactive table editor in the password import dialog, allowing cell modifications, row insertions/deletions, and validation of required fields prior to database persistence.
- **Password-Protected & Multi-Scope Exports**: Added POST-based export authorization verified via the user's profile bcrypt password hash. Supports multi-selecting label/project scopes for downloading decrypted plain text CSV sheets.
- **Copy-on-Click Credential Tooltips**: Enabled hover states to copy usernames and passwords to the clipboard. Password clicks securely invoke a background reveal API endpoint, decodes the AES-256-GCM ciphertext, and displays a floating "Copied!" notification.
- **Image Vault Parallel Upload Queue & Thumbnail Compression**: Upgraded uploads to a parallel queue manager (concurrency 3) with dynamic progress bars. Compress uploaded screenshots and mockups client-side to max 300px WebP data URLs using canvas, saving R2 egress fees by serving thumbnails directly from the MongoDB document layer.
- **Notes Editor Double-Click & Auto-Save**: Refactored notes to auto-save title/content in the background on click-outside or Escape. Enabled editing via double-clicking. Prevents block editor errors on raw HTML snippets by routing them to a raw tabbed editor workspace.
- **Workspace Navigation loading.tsx Boundary**: Implemented a global workspace route loader boundary featuring a spinning Lucide loader and pulse animation for smooth page transitions.
- **TanStack Query Cache Tuning**: Tuned query defaults to 10-minute fresh states and 15-minute garbage collection. Added cache invalidations on all dashboard metrics when tasks, projects, calendar events, documents, or notes are changed.
- **Document Vault Zoom & Format Whitelist**: Expanded allowed file types to support CSV, JSON, YAML, log, xlsx, and SVG, and integrated browser extension MIME-type fallbacks. Configured PDF previews to fit horizontal dimensions and stretch to fill the viewport height.
- **Cleanup and Assignee Removal**: Removed unused assignee properties across task schemas, database models, dashboard widgets, and UI tables to simplify workflow tracking.

### v2.1.0 — Progress Tracker Redesign, Task Modals, Field Drag & Drop, Upload API, Next.js 16 Auth Proxy & Dynamic Titles
- **Section Rearrange Drag Preview Centering**: Pinned the dragged section card preview's exact center directly under the cursor (`transform: translate(-50%, -50%)`) inside container-relative absolute bounds.
- **Sidebar Recently Updated Section**: Renamed sidebar projects list to `RECENTLY UPDATED` with direct header link (`/projects`), displaying top 5 most recently active projects (`updatedAt` descending).
- **Auto-Touch Project Timestamp Triggers**: Added `ProjectService.touch(projectId)` across all Task, Note, Details, Pipeline, Image, Document, and Password create/edit/delete operations to keep project activity timestamps fresh.
- **Dynamic Browser Tab Titles**: Added dynamic `document.title` updates across all pages (`<Project Name> - DevHub`, `Doc Vault - DevHub`, `Whiteboard - DevHub`, `MD Preview - DevHub`, etc.) with async loading guard to prevent title flickering.
- **Next.js 16 Proxy Authentication (`proxy.ts`)**: Migrated middleware to Next.js 16's official `proxy.ts` convention with silent refresh token fallback in `getSession()`.
- **Image & Document Upload API**: Built server-side `FormData` streaming upload endpoints for Cloudflare R2 (`/api/documents/upload` & `/api/projects/[id]/images/upload`) to eliminate browser CORS preflight restrictions.
- **In-Section Field Drag & Drop**: Implemented native HTML5 drag-and-drop field reordering inside custom section cards in Edit Mode.
- **Task Table Layout & Text Wrapping**: Applied `table-fixed` layout, established strict column widths, and enforced `break-all` wrapping for long task titles to prevent cell displacement.
- **Full-Width Expanded Task View**: Expanded task description and comment rows to span all 7 columns of the progress table matching mockup specs.
- **Edit Task Modal 2-Section Redesign**: Refactored `TaskDialog` into a clean 2-column layout with isolated right-side comments panel and real-time live query updates.

### v2.0.0 — Global Image Vault, Developer Tools Suite & Whiteboard Engine
- **Global Image Vault**: Promoted Image Vault to a top-level sidebar route (`/images`) with global search, project filtering, and R2 uploads across all projects.
- **Developer Tools Navigation**: Added a `TOOLS` section to the main navigation sidebar containing Markdown Previewer, HTML Previewer, JSON Formatter, and Whiteboard Canvas.
- **Markdown & Mermaid Live Previewer**: Built split-screen `/tools/markdown` supporting GFM tables, code blocks, syntax highlighting, and live ```` ```mermaid ```` SVG flowchart rendering.
- **HTML & CSS Sandbox**: Built split-screen `/tools/html` with live sandboxed `<iframe>` previewing for HTML5, inline CSS, and interactive JavaScript.
- **JSON Formatter & Line Validator**: Built `/tools/json` for 2-space prettifying, minifying, copying, and real-time JSON syntax error validation.
- **Excalidraw-like Whiteboard Canvas**: Built `/tools/whiteboard` featuring selection/resize handles, vector pen, line, arrow, rectangle (with rounded corners toggle), circle, text, eraser, and spacebar panning.
- **Whiteboard Stroke & Fill Controls**: Added stroke color swatches, fill color swatches, stroke width selectors (`2px` - `8px`), and rectangle corner rounding toggle.
- **Full Screen Preview Modals**: Added fullscreen expand modes for both HTML Sandbox and Markdown Previewer panes with z-50 overlay toggles.
- **LocalStorage State Persistence**: Added automatic `localStorage` caching across Markdown, HTML, JSON, and Whiteboard tools to preserve user inputs across reloads.
- **1:1 Offscreen Canvas Export Engine**: Added high-resolution **Export PNG** image download and native **Export PDF** document generation using `jsPDF`.
- **UI Cleanup & Single Action Button**: Removed duplicate top-header buttons in Document Vault and Password Vault, leaving a single clean toolbar button.
- **Notes Editor & ProseMirror Transaction Fix**: Integrated visual Notion-style editor with visual slash commands (`/`) and deferred state updates to prevent model sync errors.
- **1:1 JS Masonry Layout Engine**: Built dynamic shortest-column layout engine for project details cards with grab cursor offset tracking in section reordering dialogs.

---

## License

Private — all rights reserved.
