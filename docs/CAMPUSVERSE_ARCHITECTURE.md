# CampusVerse Architecture Audit

Audit scope: source inspection only, August 2026. No application code, dependencies, configuration, or data was changed. The current repository is the source of truth.

## Repository map

Repository workspace contains `adt-campus-connect-main/`, the application root.

| Path | Observed purpose |
|---|---|
| `src/` | React web application source: pages, layouts, shared cards/header, UI primitives, hooks and API helper. |
| `src/pages/` | Route-level public, student, club-admin, faculty, and super-admin screens. |
| `src/components/` | `Header`, reusable event/club cards, role layouts, and `components/ui/` shadcn/Radix-style primitives. |
| `src/lib/` | API client (`api.ts`) and CSS utility (`utils.ts`). |
| `src/integrations/supabase/` | Generated Supabase client/types. No active imports from application screens were found. |
| `public/` | Static files: logo (`top.png`), favicon, robots and placeholder SVG. |
| `dist/` | Existing Vite build output; generated artifact, not source. |
| `server/` | Express API, MongoDB models, routes, middleware, services, seed/repair scripts and certificate template. |
| `server/routes/` | HTTP route handlers; controllers are implemented inline rather than in a separate controller directory. |
| `server/models/` | Mongoose schemas. |
| `server/middleware/` | JWT/RBAC and multipart image-upload middleware. |
| `server/services/` | Certificate generation and timetable-based attendance-verification routing. |
| `server/scripts/`, `server/seed*.js`, `createAdmin.js`, `fixindex.js` | Data-seeding/maintenance scripts. Their operational use is UNKNOWN — REQUIRES HUMAN CONFIRMATION. |
| `server/templates/` | HTML certificate rendering template. |
| `supabase/` | Supabase local configuration. Active production role is UNKNOWN — REQUIRES HUMAN CONFIRMATION. |
| `.claude/` | Tooling metadata; application purpose UNKNOWN — REQUIRES HUMAN CONFIRMATION. |

Not found: dedicated controllers, generic services (beyond the two listed), notification/socket modules, tests, CI workflow, Docker/deployment manifests, mobile project, or a backend build/start script.

## Actual technology stack

### Web frontend

- React 18.3.1 + React DOM, TypeScript 5.8.3, Vite 7.2.2 (`package.json`, `src/main.tsx`).
- React Router DOM 6.30.1; routes defined in `src/App.tsx`.
- Tailwind CSS 3.4.17, PostCSS/autoprefixer and shadcn-ui configuration (`tailwind.config.ts`, `src/index.css`, `components.json`). Radix UI primitives, Lucide React icons and Sonner/toast are used.
- Browser `fetch` through `src/lib/api.ts`; no Axios. TanStack React Query provider is mounted but no `useQuery`/`useMutation` usage was found.
- Forms: React Hook Form + Zod in auth, password, club profile, and event forms.
- State: component-local React state and `localStorage`; no Redux/Zustand/global application store found.
- Supabase package/client exists but no active web feature consumes it.

### Backend

- Node.js ESM project; Express 5.2.1 (`server/package.json`, `server/server.js`).
- MongoDB through Mongoose 8.19.3; connection uses `MONGO_URI` and database name `CampusVerseDB` (`server/server.js`).
- JWT (`jsonwebtoken`) bearer authentication, bcrypt password hashing, role middleware (`server/middleware/auth.js`, `rbac.js`).
- Multer memory uploads restricted to images up to 5 MB, sent to Cloudinary (`server/middleware/upload.js`).
- QR generation (`qrcode`), Puppeteer PDF certificates, Cloudinary raw PDF storage, node-cron daily certificate job.
- No email is operational: certificate email is explicitly a commented stub. No notification persistence or sockets found.

### Configuration and deployment

- Vite dev server port 8080 proxies `/api` to `http://localhost:5000` (`vite.config.ts`).
- API server listens on `0.0.0.0:${PORT || 5000}` (`server/server.js`).
- Permitted CORS origins are localhost ports 5173/8080 plus LAN IPv4 forms for those ports; it allows credentialed requests and non-browser requests.
- Cloudinary, MongoDB, JWT, QR secret, Supabase variables and port are configured in committed `.env` / `server/.env` files; see security notes.
- Deployment arrangement is UNKNOWN — REQUIRES HUMAN CONFIRMATION. README mentions Lovable publishing, but no deployed API URL/configuration was found.

## Runtime architecture

```text
Browser React app
  src/main.tsx -> App.tsx -> React Router screen/layout
  src/lib/api.ts reads cv_token from localStorage
       |
       | Same-origin /api request in development
       v
Vite proxy (localhost:8080 -> localhost:5000) OR direct hosted same origin
       |
       v
Express server.js -> CORS + JSON parser -> mounted route router
       |                         |
       | protected routes        +-> verifyToken -> requireRole
       v
Inline route handler/business rules -> Mongoose -> MongoDB CampusVerseDB
       |                                      |
       +-> Cloudinary (images/QR/cert PDFs), Puppeteer, cron as applicable
       v
JSON response -> component local state / toast UI
```

The web API helper sets `API_URL = window.location.origin`; it relies on the Vite proxy in development. It always parses JSON and does not throw on HTTP non-2xx status. Multipart routes use `FormData` and bearer authorization without manually setting a content type.

### Frontend route architecture

Public: `/`, `/auth`, `/dashboard`, `/clubs`, `/clubs/:id`, `/change-password`, `/certificates`, `/verify/:certId`.

Role layouts: `/club/*`, `/admin/*`, `/faculty/*` all use localStorage role checks in their layouts plus backend role enforcement. The public header is responsive; role portals have desktop fixed sidebars and mobile drawer overlays. `/dashboard` performs student-oriented data requests but is not wrapped in a dedicated route guard.

## Key observed inconsistencies / risks

- `server/server.js` contains trailing static-build code after `app.listen()` that references `path`, `express`, and `app` outside their declared module scope. It is currently an existing uncommitted file modification and was not changed. Runtime impact is UNKNOWN — REQUIRES HUMAN CONFIRMATION; if executed as displayed, it would throw on module evaluation.
- Admin event and student count aggregations use `eventId` / `userId`, while the registration schema defines `event_id` / `student_id`; counts will likely be zero. This affects web and mobile displays.
- `src/pages/admin/AllEvents.tsx` calls a club-admin-only cancel endpoint while logged in as super admin; this will be rejected by RBAC.
- `src/pages/ClubDetail.tsx` appears to expect `_id` at the root, but `/api/public/clubs/:id` returns `{ club, upcomingEvents, pastEvents }`; displayed detail behavior needs runtime confirmation.
- Layout navigation includes `/club/settings`, `/admin/settings`, and `/faculty/settings`, but `App.tsx` defines no such routes.

See the companion documents for API, schema, auth, features, design, and mobile plan.
