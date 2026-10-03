# SMVS-108 Frontend

Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui.

## Getting started

```bash
npm install
cp .env.example .env.local   # then adjust values
npm run dev                  # http://localhost:3016
```

## Scripts

| Script          | Description                         |
| --------------- | ----------------------------------- |
| `npm run dev`   | Start dev server on port 3016       |
| `npm run build` | Production build                    |
| `npm start`     | Serve production build on port 3016 |
| `npm run lint`  | Run ESLint                          |

## Environment

| Variable                   | Description          | Default                        |
| -------------------------- | -------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://localhost:5001/api/v1` |

## Structure

```
app/
  (main)/            # Pages that use the sidebar layout
    layout.tsx
    dashboard/page.tsx
  layout.tsx         # Root layout
  page.tsx           # Redirects to /dashboard
  not-found.tsx
components/
  layout/            # App shell (sidebar, header)
  ui/                # shadcn/ui primitives
config/
  navigation.ts      # Sidebar menu items
  site.ts            # App name / metadata
hooks/
lib/
  api.ts             # Axios client for the backend
  utils.ts
```

## Adding a page

1. Create `app/(main)/<name>/page.tsx`.
2. Add a menu entry in `config/navigation.ts`.

Add more shadcn/ui components with `npx shadcn@latest add <component>`.
