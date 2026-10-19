# Multi-Vertical Company CRM

A production-quality internal CRM web application built for businesses operating across multiple distinct business verticals (such as **Mentorship**, **C2C Marketplace**, **SaaS Solutions**, and **Corporate Training**), engineered strictly for **100% Free-Tier operation** across Supabase and Vercel.

---

## Key Highlights

- **Pure Data-Driven Verticals**: Verticals are first-class data models, not hardcoded conditionals. Admins can create, rename, customize stages, and archive verticals with zero code changes.
- **Enterprise-Grade Row Level Security (RLS)**: Enforced directly within the Postgres database engine via `has_vertical_access(vertical_id)` and `can_write_vertical(vertical_id)`. Cross-vertical unauthorized data access is blocked at the database level.
- **Fractional Indexing**: Drag-and-drop Kanban pipeline updates use `O(1)` floating positions (`(prev + next) / 2`), eliminating heavy multi-row list reordering.
- **Free Tier Optimizations**:
  - Keep-alive scheduled ping (`.github/workflows/keep-alive.yml`) to prevent 7-day auto-hibernation.
  - Direct invitation link generator to avoid SMTP email limits.
  - CSV injection protection against formula exploitation.
  - Built-in TOTP Multi-Factor Authentication (mandatory for Admins).

---

## Tech Stack (100% Free Tier Compatible)

| Area | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router) + React 19 + TypeScript (Strict) |
| **Styling & Design** | Tailwind CSS + Radix UI + Lucide Icons + `next-themes` (Dark/Light mode) |
| **Backend & Database** | Supabase Postgres with Row Level Security (RLS) + `@supabase/ssr` |
| **State & Data Fetching** | TanStack React Query v5 |
| **Validation** | Zod + React Hook Form (shared client and server schemas) |
| **Testing** | Vitest (Unit) + Playwright (E2E) |
| **Hosting** | Vercel Free Tier |

---

## Getting Started

### 1. Prerequisites
- Node.js `v20+`
- npm `v10+`

### 2. Local Setup
```bash
# Clone the repository
git clone <repo-url>
cd ls-crm

# Install dependencies
npm install --legacy-peer-deps

# Copy environment variables
cp .env.example .env.local

# Run unit tests
npm test

# Start local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Supabase Database Setup

### Option A: One-Click SQL Editor Execution (Recommended)
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to your Supabase Project Dashboard -> **SQL Editor**.
3. Copy the entire contents of [`supabase/schema.sql`](file:///c:/Users/USER/Desktop/port-proj/ls-crm/supabase/schema.sql) and paste it into the editor.
4. Click **Run**. This provisions all tables, foreign keys, RLS policies, triggers, and seeds the 4 core verticals (**Mentorship**, **C2C**, **SaaS**, **Training**).

### Option B: Supabase CLI Migrations
If using the Supabase CLI:
```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

### Environment Configuration
Obtain your API keys from **Project Settings -> API** in Supabase and update your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## How to Add a New Business Vertical

1. Log into the CRM as an **Owner** or **Admin**.
2. Navigate to **Settings -> Verticals** (`/settings/verticals`) or press `Ctrl+K` and type `Create New Vertical`.
3. Click **Create Vertical**.
4. Enter:
   - **Name**: e.g. `Executive Search`
   - **Slug**: e.g. `executive-search`
   - **Color**: Select your brand accent color
   - **Icon**: Choose from the icon set
   - **Description**: Operational summary
5. Click **Create Vertical**.
6. The database trigger automatically generates:
   - 6 standard pipeline stages (`New Lead`, `Contacted`, `Qualified`, `Proposal Sent`, `Won Deal`, `Lost Deal`).
   - A dedicated Operations & Delivery Kanban board with columns (`Backlog`, `In Progress`, `In Review`, `Done`).
   - The vertical immediately appears in the Global Switcher and Navigation for authorized members.

---

## How to Invite Team Members

The application operates in **Invite-Only mode** (public registration is disabled):
1. Navigate to **Settings -> Team** (`/settings/team`).
2. Click **Invite Team Member**.
3. Specify their full name, corporate email, governance role (`Member`, `Manager`, `Viewer`, `Admin`), and permitted verticals.
4. Click **Generate Invitation**.
5. You can copy the generated direct invitation link (`/accept-invite?token=...`) and share it directly with the colleague to avoid free-tier SMTP rate limits.

---

## Free-Tier Hibernation Prevention

Supabase free-tier projects automatically pause after approximately 7 days of inactivity. This repository includes a pre-configured GitHub Actions workflow:
- File: [`.github/workflows/keep-alive.yml`](file:///c:/Users/USER/Desktop/port-proj/ls-crm/.github/workflows/keep-alive.yml)
- Runs automatically every Monday and Thursday at 06:00 UTC.
- Issues an authenticated REST ping against `/rest/v1/verticals?select=id&limit=1` to keep the database warm and prevent pausing.
- Configure `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your GitHub Repository Secrets.

---

## Automated Backups via GitHub Actions (`pg_dump`)

To maintain complete free backups without paying for Supabase Pro point-in-time recovery:
1. In your GitHub repository, configure a scheduled workflow using Postgres client tools:
```yaml
name: Scheduled Database Backup
on:
  schedule:
    - cron: '0 2 * * 0' # Weekly Sunday at 02:00 UTC
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Run pg_dump
        run: |
          PGPASSWORD="${{ secrets.DB_PASSWORD }}" pg_dump -h db.${{ secrets.PROJECT_REF }}.supabase.co -U postgres -d postgres -F c -b -v -f backup.dump
      - name: Upload Backup Artifact
        uses: actions/upload-artifact@v4
        with:
          name: db-backup
          path: backup.dump
          retention-days: 30
```

---

## Testing & Quality Assurance

```bash
# Run unit test suite (Vitest)
npm test

# Verify production build & strict TypeScript check
npm run build
```

---

## Phase Summary

| Phase | Status | Scope |
| :--- | :--- | :--- |
| **Phase 1: Architecture & Plan** | Completed | Full database schema, RLS matrix, folder structure, free-tier risk analysis. |
| **Phase 2: Foundation & Data-Driven Verticals** | Completed | Next.js 16 + React 19 + Tailwind, Supabase migrations & triggers, Auth, Profiles, Roles, Verticals CRUD, Topbar/Sidebar layout, Theme switcher. |
| **Phase 3: Leads & Customers Directory** | Completed | Dynamic Table & Kanban pipeline, activity timeline, 1-click lead conversion, multi-vertical accounts, CSV import/export, deduplication. |
| **Phase 4: Tasks & Reminders** | Completed | My Tasks & Team Tasks, timeframe filters (Due Today, Upcoming, Overdue, Completed), quick-add, entity links, overdue alert banner. |
| **Phase 5: Project Planner Kanban** | Completed | Dynamic boards per vertical, `@dnd-kit` drag-and-drop, fractional index positioning, subtask checklists with progress bar, discussion comments, lead/customer linking. |
| **Phase 6: Reporting & Analytics** | Completed | Executive dashboard, cross-vertical comparative revenue matrix, pipeline velocity & stage funnel, team capacity matrix, timeframe filters, CSV export. |
| **Phase 7: Administration, Security & Data Recovery** | Completed | Full security audit trail, side-by-side JSON Delta Diff modal, 30-day soft-delete Recycle Bin with instant restore & permanent purge, global `⌘K` command palette with fuzzy search & hotkey helper (`?`). |

