# Airship Express — Freight Operations & Shipment Execution Subsystem

A production-oriented logistics platform for booking, consolidating, documenting, and
tracking multimodal freight — built on **Next.js (App Router)**, **Supabase
(PostgreSQL + Auth + Realtime)**, and role-based access control.

> **Zero hardcoded mock data.** Every screen reads directly from Supabase and renders
> clean empty-state components when a table has no rows.

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Core modules](#core-modules)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Setup](#setup)
6. [Environment variables](#environment-variables)
7. [Database schema & RBAC](#database-schema--rbac)
8. [Running the app](#running-the-app)
9. [Roles & permissions](#roles--permissions)
10. [AI features](#ai-features)
11. [Project structure](#project-structure)
12. [Windows / PowerShell note](#windows--powershell-note)

---

## Tech stack

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| Framework    | Next.js 14 (App Router, Server Components, Server Actions)         |
| UI           | React 18, Tailwind CSS, Lucide React icons                        |
| Charts        | Recharts                                                           |
| Backend      | Next.js Route Handlers + Server Actions (Node runtime)            |
| Database     | Supabase (PostgreSQL) with Row Level Security                     |
| Auth         | Supabase Auth (email/password) + RBAC via a `profiles` table      |
| Realtime     | Supabase Realtime (`postgres_changes`) for live tracking & feed   |
| AI           | Groq (preferred) or Google Gemini — server-side only              |

**Palette:** clean white base (`#FFFFFF` / `#F9FAFB`), pink accents
(`#EC4899` / `#F43F5E`), dark slate sidebar (`#0F172A`).

---

## Core modules

1. **Dashboard Overview** — KPI cards, real-time activity feed, quick actions, and a
   monthly volume analytics chart.
2. **Booking & AI Routing** — multi-modal shipment booking form with AI-generated
   route recommendations (fastest / cheapest / greenest).
3. **LCL / FCL Consolidation** — container load planning and grouping of shipments
   into containers, with live capacity utilization.
4. **House & Master BoL** — generate printable House and Master Bills of Lading; parse
   unstructured BoL text into structured fields via AI.
5. **Live Shipment Tracking** — Branch Hub → Carrier Batching → Handover to J&T handover path, status timeline, and location logs updated
   in real time through Supabase Realtime.
6. **PO Integration & SLA** — link purchase orders to shipments and track line-item
   fulfillment progress.

---

## Architecture

- **Server Components** fetch data directly from Supabase with the request-scoped,
  cookie-bound server client — RLS enforces per-role visibility.
- **Server Actions** (`"use server"`) handle all mutations (booking, consolidation,
  BoL creation, location updates) and `revalidatePath` the affected routes.
- **Route Handlers** under `src/app/api/ai/*` gate the AI helpers behind an
  authenticated session; API keys never reach the browser.
- **Middleware** refreshes the Supabase session on every request and redirects
  unauthenticated users to `/login`.

---

## Prerequisites

- **Node.js 18.17+** (Node 20 LTS recommended)
- A **Supabase project** (free tier is fine)
- Optional: a **Groq** or **Gemini** API key to enable AI features

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
#   then fill in the values (see below)

# 3. Apply the database schema
#   Local: supabase start && supabase db reset  (applies migrations + seed)
#   Hosted: open the Supabase Dashboard -> SQL Editor -> paste the contents of
#   supabase/migrations/0001_initial_schema.sql -> Run.
#   (Optional) run supabase/seed.sql afterwards for sample data.

# 4. Start the dev server
npm run dev
```

Then open <http://localhost:3000> and register your first user from the **Register**
tab. Self-registration is limited to the **Client** and **Carrier** roles; privileged
roles (**Admin / Dispatcher / Planner**) must be provisioned by an administrator
(see `ALLOW_QUICK_LOGIN` for enabling the one-click demo accounts in production).

---

## Environment variables

Copy `.env.local.example` to `.env.local` and set:

| Variable                        | Required | Purpose                                            |
| ------------------------------- | -------- | -------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅       | Supabase project URL                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅       | Public anon/publishable key (safe for the browser) |
| `SUPABASE_SERVICE_ROLE_KEY`     | ⚙️       | Server-only key for trusted admin/seed operations  |
| `ALLOW_QUICK_LOGIN`             | ⭘        | Enable one-click demo accounts in production       |
| `GROQ_API_KEY`                  | ⭘        | Enables AI routing & BoL parsing (preferred)       |
| `GEMINI_API_KEY`                | ⭘        | Fallback AI provider if Groq is not set            |
| `GROQ_MODEL`                    | ⭘        | Override (default `llama-3.3-70b-versatile`)        |
| `GEMINI_MODEL`                  | ⭘        | Override (default `gemini-2.0-flash`)              |

> `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — keep it server-side only, never expose it
> to the client. AI features are optional: with no key set, AI buttons report that no
> provider is configured and the rest of the app works normally.

---

## Database schema & RBAC

The full DDL lives in
[`supabase/migrations/0001_initial_schema.sql`](supabase/migrations/0001_initial_schema.sql)
and includes:

- **Enums** — `app_role`, `transport_mode`, `shipment_status`, `container_status`,
  `bol_type`, `po_status`, `load_type`.
- **8 tables** — `profiles`, `shipments`, `shipment_tracking_logs`, `containers`,
  `container_shipments`, `bills_of_lading`, `purchase_orders`,
  `purchase_order_items`.
- **RBAC helpers** — `current_role()` and `is_staff()` (SECURITY DEFINER) used by RLS
  policies.
- **Row Level Security** on every table, scoping staff / carrier / client visibility.
- **Realtime** publication for `shipments`, `shipment_tracking_logs`, and `containers`.
- **Triggers** — `updated_at` maintenance and `handle_new_user()`, which auto-creates a
  `profiles` row (with the chosen role) whenever a user signs up.

The TypeScript mirror of this schema is in
[`src/types/database.ts`](src/types/database.ts). If you change the DDL, regenerate or
update these types to keep the typed Supabase client accurate.

---

## Running the app

| Command            | Description                            |
| ------------------ | -------------------------------------- |
| `npm run dev`      | Start the dev server (hot reload)      |
| `npm run build`    | Production build + type checking       |
| `npm run start`    | Serve the production build             |
| `npm run lint`     | ESLint                                 |
| `npm run typecheck`| `tsc --noEmit` type check              |

---

## Roles & permissions

| Role         | Sees                                                             | Can manage                          |
| ------------ | --------------------------------------------------------------- | ----------------------------------- |
| **Admin**    | Everything, plus the Schema page                                | All records                         |
| **Dispatcher** | All operational modules                                       | Booking, consolidation, BoL, tracking |
| **Carrier**  | Dashboard, tracking for their assigned loads                    | Location/status updates on own loads |
| **Client**   | Dashboard, tracking, and POs for their own shipments            | Read-only                           |

Navigation items in the sidebar are filtered by role (see
[`src/lib/nav.ts`](src/lib/nav.ts)), and RLS enforces the same boundaries at the
database level.

---

## AI features

AI is server-side only (see [`src/lib/ai.ts`](src/lib/ai.ts)):

- **Route recommendations** — `POST /api/ai/routing` returns 3 diverse routes
  (fastest, most economical, greenest) for the booking form.
- **Bill of Lading parsing** — `POST /api/ai/parse-bl` extracts structured fields from
  pasted BoL text for the BoL generator.

The provider is chosen automatically: **Groq** if `GROQ_API_KEY` is set, otherwise
**Gemini**. Both calls request structured JSON output and validate it before use.

---

## Project structure

```
src/
├── app/
│   ├── (app)/                 # Authenticated app shell (sidebar + header)
│   │   ├── dashboard/         # Hub KPIs, platform volume, live feed
│   │   ├── pickup/            # Seller pickup scheduling & quick intake
│   │   ├── booking/           # Parcel intake + dynamic delivery-platform dropdown
│   │   ├── manifest/          # Courier manifesting (batch by platform)
│   │   ├── handover/          # Rider sign-off & handover history
│   │   ├── waybill/           # Waybill / document generator
│   │   └── schema/            # Admin-only DDL viewer
│   ├── api/ai/                # Server-only AI route handlers
│   ├── login/                 # Auth (sign in / register) + server actions
│   └── layout.tsx             # Root layout
├── components/                # UI, layout, dashboard
├── lib/
│   ├── supabase/              # Browser, server, middleware, admin clients
│   ├── ai.ts                  # Groq / Gemini helpers
│   ├── auth.ts                # requireProfile / requireRole
│   ├── nav.ts                 # Role-based navigation
│   ├── queries.ts             # Stats & data helpers
│   └── utils.ts               # Formatting + shared constants
├── types/
│   ├── database.ts            # Supabase schema types
│   └── index.ts               # Domain type aliases
└── middleware.ts              # Session refresh + auth redirects

supabase/
├── config.toml               # Local dev config (ports, auth, seed)
├── migrations/
│   ├── 0001_initial_schema.sql   # Full DDL: enums, tables, RLS, realtime, triggers
│   └── 20260806_planner_rbac.sql # Incremental Planner/load-plan RBAC (idempotent)
└── seed.sql                   # Demo parcels, sellers, manifests (applied on `supabase db reset`)
```

---

## Windows / PowerShell note

If the project path contains spaces or `&`, the npm-generated `next` shim can fail to
resolve. Invoke the Next.js binary directly instead:

```powershell
node "./node_modules/next/dist/bin/next" dev
node "./node_modules/next/dist/bin/next" build
```

---

Built with a clean white UI, pink accents, and a dark slate command sidebar.
