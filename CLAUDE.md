# CLAUDE.md

## Project Overview

FICC (Fixed Income, Currency, and Commodities) Portfolio Dashboard built with Next.js. Evolved from the Next.js App Router Course into a specialized financial monitoring application featuring BTB (Back-to-Back) portfolio tracking with Excel data integration.

## Tech Stack

- **Framework**: Next.js 15.0.0-rc.0 (App Router)
- **Language**: TypeScript 5.2.2
- **React**: 19.0.0-rc
- **Database**: PostgreSQL via `@vercel/postgres`
- **Auth**: NextAuth.js 5.0.0-beta.19 (credentials provider, bcrypt)
- **Styling**: Tailwind CSS 3.3.3 with `@tailwindcss/forms`
- **Validation**: Zod 3.23.8
- **Excel Parsing**: XLSX 0.18.5
- **Package Manager**: pnpm

## Commands

```bash
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm prettier         # Format code
pnpm prettier:check   # Check formatting
pnpm seed             # Seed database with placeholder data
```

## Project Structure

```
app/
├── api/auth/[...nextauth]/   # NextAuth route handler
├── dashboard/
│   ├── (overview)/           # Main dashboard (route group)
│   ├── invoices/             # Invoice CRUD pages
│   └── customers/            # Customer list
├── ui/
│   ├── dashboard/            # Dashboard components (btb-dashboard, cards, algo-feed, sidenav)
│   ├── invoices/             # Invoice UI components
│   └── customers/            # Customer UI components
├── lib/
│   ├── data.ts               # Database queries (SQL via @vercel/postgres)
│   ├── definitions.ts        # TypeScript type definitions
│   ├── actions.ts            # Server actions (form mutations)
│   ├── utils.ts              # Utility functions
│   ├── excel-loader.ts       # Excel file loading (XLSX)
│   └── ficc-data.ts          # FICC market data fetching (mock)
├── login/                    # Login page
├── layout.tsx                # Root layout
└── page.tsx                  # Landing page
auth.ts                       # NextAuth configuration
auth.config.ts                # Auth callbacks
middleware.ts                 # Route protection middleware
```

## Key Patterns

- **Server Components by default** — async components fetch data directly. Use `'use client'` only when state/interactivity is needed.
- **Data fetching**: Direct SQL queries in `app/lib/data.ts` with `sql<Type>` generics. `noStore()` disables caching for real-time data.
- **Server Actions**: Form mutations in `app/lib/actions.ts` using Zod validation and `revalidatePath`.
- **Suspense boundaries** with loading skeletons for async components.
- **Path alias**: `@/*` maps to project root.
- **Currency**: Amounts stored in cents (integers), formatted to USD for display.
- **Pagination**: 6 items per page; search via SQL ILIKE.

## Code Conventions

- Components: kebab-case filenames (`btb-dashboard.tsx`), PascalCase exports
- All components are functional TypeScript React components
- Tailwind CSS for all styling (no CSS modules)
- Prettier with Tailwind class sorting plugin
- ESLint extends `next/core-web-vitals`

## Excel Data Integration

- Excel files (`.xlsx`) in project root are read server-side by `app/lib/excel-loader.ts`
- `getExcelRawData()` returns 2D arrays via XLSX `sheet_to_json` with `header: 1`
- BTB dashboard (`btb-dashboard.tsx`) parses data using keyword search (`findLoc`) to locate cells
- Korean financial report format with keywords like "기준일", "원화 잔고(억)", "daily PnL"

## Environment Variables

Required in `.env`:

```
POSTGRES_URL, POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING
POSTGRES_USER, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_DATABASE
AUTH_SECRET          # Generate: openssl rand -base64 32
AUTH_URL             # e.g. http://localhost:3000/api/auth
```

## Authentication Flow

Login at `/login` → credentials verified against PostgreSQL → bcrypt comparison → NextAuth session → middleware protects `/dashboard/*` routes.

## Branches

- `main`: Active development branch
- `master`: Main/default branch
