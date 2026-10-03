# SMVS 108 Frontend

Web app for the SMVS 108 emergency and rapid-response system (release 1, modules M1–M8).
Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + TanStack Query. English and Gujarati.

## Getting started

```bash
npm install
cp .env.example .env.local   # point NEXT_PUBLIC_API_BASE_URL at the backend
npm run dev                  # http://localhost:3016
```

The backend must be running (see `smvs-108-backend`). Sign in with a mobile number and PIN.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Dev server on port 3016 |
| `npm run build` | Production build |
| `npm start` | Serve the production build on port 3016 |
| `npm run lint` | ESLint |
| `npx playwright test` | End-to-end tests (resets the **local** backend database first) |

## Environment

| Variable | Description | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://localhost:5001/api/v1` |

## Screens

| Route | Who | What |
| --- | --- | --- |
| `/login` | everyone | Mobile + PIN, language switch |
| `/control-room` | Control Room, Head, Viewer, Leaders (own zone) | Live request board with dispatch / arrive / resolve timers, team board, reserve indicator |
| `/display` | same | Large wall display |
| `/requests/new` | Control Room; Leaders/Deputies in their zone | Five-fact intake, extra fields per issue, duplicate warning, drill, back-entry, self-raise |
| `/requests/[id]` | by data scope | Dispatch suggestions, assignments, recall, on-behalf updates, close/cancel/merge/reopen, notes & photos, timeline |
| `/requests` | by data scope | Searchable history |
| `/my-assignment` | Leader, Deputy, Member | Big-button field screen: Arrived → Working → Resolved, need more manpower, check-in, team status |
| `/teams`, `/teams/roster` | by permission | Team status, attendance, leadership swap, shift roster with coverage |
| `/approvals` | 108 Head | Reserve release approvals |
| `/alerts`, `/profile` | everyone | In-app alerts; language and PIN |
| `/admin/...` | Config Admin | Setup check, drill mode, every configuration list, users, permission matrix, events (go live, clone), change history |

Navigation is filtered by the permission matrix. Live updates come over Server-Sent Events, with 15-second polling as a fallback. Field taps made without network are queued on the phone and sent with their original time.

## Structure

```
app/(main)/          Signed-in pages with the sidebar layout
app/login, app/display
components/layout/   Sidebar, header, auth guard
components/requests/ Request card, timers, intake parts, dispatch panel, actions, notes, timeline
components/teams/    Team tile, reserve indicator
components/ui/       shadcn/ui primitives
config/              Navigation (with permission rules), site
lib/                 API client, auth, i18n (en/gu), realtime, queries, time, offline queue, admin helpers
e2e/                 Playwright tests
```

## Deployment (Vercel)

Import the repo, keep the Next.js defaults, and set `NEXT_PUBLIC_API_BASE_URL` to the backend URL ending in `/api/v1`.
