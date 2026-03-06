# FusionCell Admin v1 MVP

Vite + React + TypeScript admin workspace for catalog, inventory, orders, and operations search.

## Quick start

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

## Core admin improvements in this build

- Sticky table headers for admin-heavy views.
- Hover-revealed row actions for cleaner scanning.
- Inline stock editing controls (`- / qty / +`) for fast inventory correction.
- Stock health bars with immediate risk labels.
- Global admin search page (`/admin-search?q=`) across orders/products and available customer emails.
- Order timeline card in order detail.
- Bulk product disable action from catalog table selection.
- Relative timestamps for faster time comprehension.

## Keyboard shortcuts

- `/` focus global search
- `n` go to catalog
- `⌘ + o` go to orders
- `⌘ + p` go to products

## Production checks

```bash
pnpm run lint
pnpm run test
pnpm run typecheck
pnpm run build
```

## Vercel deployment

This repository is now pre-configured for Vercel builds with `vercel.json`.

```bash
pnpm run build:vercel
pnpm run vercel:deploy
```

If running in CI, make sure these environment variables are set:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
