# CampusVerse Mobile Plan (Recommendation Only)

This is a plan for a new client of the existing API/database, not an implementation or authorization for backend changes.

## Reuse classification

| Classification | Existing items |
|---|---|
| A. Directly reusable | TypeScript API field knowledge, validation/business rules, visual tokens/content assets, API endpoint semantics. Web React components cannot be directly rendered in React Native. |
| B. Reusable through existing APIs | Auth, public discovery, clubs, registrations/QR, student dashboard/certificates, club event management/scanning, faculty verification/timetable, admin reporting/moderation. |
| C. Web-specific | Vite proxy, `window.location`, React DOM/Router, localStorage, Tailwind DOM classes, shadcn/Radix components, html5-qrcode, browser download/object URL behavior. |
| D. Backend change may be required | Stable deployed API URL/CORS strategy; paging/filter contracts; refresh/revocation; potential profile endpoint; push notification delivery. |
| E. UNKNOWN | Production hosting/TLS, device offline requirements, role rollout scope, payment expectations, App Store/Play requirements. |

## Recommended screens

### Auth

- Welcome/sign-in: userId/password -> `/auth/login`; secure token storage; route by returned role and `must_change_password`.
- Student sign-up: institutes/divisions plus `/auth/register`.
- Change password: `/auth/change-password`; mandatory route where user flag dictates.

### Student core (recommended first release)

- **Home/Events**: upcoming events + local search/filter, `GET /public/events/upcoming`; authenticated users also call `GET /student/my-event-ids`.
- **Event QR / registration**: event card/detail and `POST /events/:id/register`; show generated QR from my-registrations. The existing backend has no public individual-event-detail endpoint; obtain data from current list payload or request backend addition later.
- **My activity**: stats, upcoming registrations, attended events and verification states using four student endpoints.
- **Certificates**: certificate list plus external/open-in-browser document behavior; public certificate verification screen uses `/public/verify/:certId`.
- **Clubs**: club list/detail via public APIs; navigate to events.
- **Profile/account**: current login identity and logout. Full student-profile editing API is not implemented.

### Role-gated modules

- **Club admin**: dashboard, club profile/image upload, events list/create/edit/cancel, past events, attendee list, scanner. Require Camera permissions and existing attendance APIs.
- **Faculty**: dashboard, pending/approved/rejected requests, request detail, individual/bulk approvals, timetable/today schedule.
- **Super admin**: dashboard, approval queue, all events/clubs/students/institutes, verification review/certificate generation. Consider whether this high-privilege UI belongs in the first mobile release — product decision required.

No mobile Notifications screen is recommended from existing behavior because there is no notification model/API. It may be a future feature only after approved backend design.

## Navigation

```text
Root
├─ Auth stack: Welcome, Sign in, Student sign-up, Change password
└─ Role root
   ├─ Student tabs: Home | My Events | Clubs | Certificates | Account
   │  stacks: Event registration/QR, Club detail, Certificate verify
   ├─ Club-admin tabs: Dashboard | Events | Scanner | Profile
   │  stacks: Create/edit/past event, Attendees
   ├─ Faculty tabs: Dashboard | Requests | Timetable | Account
   │  stacks: Request detail/action
   └─ Admin tabs: Dashboard | Approvals | Management | Account
      stacks: Events, clubs, students, institutes, verifications
```

Use modal/sheet presentation for filters, image selection and rejection reason; a full-screen native camera scanner for attendance.

## Recommended React Native architecture

- **Expo + TypeScript**: recommended for fast cross-platform delivery, managed camera/image/SecureStore modules, OTA-friendly workflow, and no present native-only need. Validate Puppeteer/server work remains server-side. Use React Native CLI only if a required institutional native SDK cannot run in Expo.
- **Navigation**: React Navigation with native-stack + bottom-tabs; separate role roots to prevent role leakage.
- **API layer**: a single `fetch` wrapper with a build-time `EXPO_PUBLIC_API_BASE_URL`, bearer injection, typed endpoint modules, HTTP status handling, timeout/retry only for safe reads, and FormData image upload adapter.
- **State**: TanStack Query for server state/cache/invalidation (already a web dependency but not currently used), small context for session/theme. Avoid a large global store unless proven necessary.
- **Secure auth**: Expo SecureStore / Keychain / Keystore for token; retain non-sensitive user profile separately if needed. Handle 401 centrally.
- **Forms**: React Hook Form + Zod schemas shared conceptually with web validations; use native inputs/pickers.
- **Theme/components**: typed purple/teal/light/dark design tokens; reusable card/button/input/badge/list/loading/error components.
- **Images and documents**: native image picker/preview and multipart upload; open Cloudinary certificate URLs with controlled platform APIs. Do not use browser object-URL download code.
- **Push**: defer. Existing backend has no device token model/notification service; requires approved backend scope first.
- **Environment**: development should use an emulator-accessible LAN/TLS endpoint, never `localhost` from a physical device. Production must use HTTPS.

## Mobile API compatibility and prioritized backend work

| Classification | Finding |
|---|---|
| SAFE | Stateless JWT bearer auth, JSON responses, no cookie dependency, native friendly no-Origin CORS behavior, Cloudinary URLs, multipart field contracts. |
| MINOR ADAPTATION | Replace browser origin/proxy/localStorage; native multipart/file/camera APIs; decode/handle HTTP errors rather than web helper behavior. |
| BACKEND CHANGE REQUIRED | Only if requirements demand token refresh/revocation, device push, a direct public event-detail endpoint, pagination at scale, a deployed/TLS native base URL, or student profile editing. |
| RISK | CORS restrictive for new browser origins; committed secrets; unpaginated lists/500 limits; background QR generation race; reported count aggregation schema mismatch; endpoint/UI mismatches. |

## Recommended development order

1. Confirm production API host/TLS and security remediation ownership; do not build around localhost.
2. Contract-test existing auth/public/student APIs against a non-production environment and resolve observed endpoint/schema mismatches.
3. Build typed Expo TypeScript foundation, secure session, API wrapper, theme and error/loading states.
4. Deliver student auth, event discovery/registration/QR, clubs, dashboard, certificates.
5. Add club scanner and event administration after physical-device camera testing.
6. Add faculty workflows; add admin workflows only if approved for mobile.
7. Design/approve notifications, refresh tokens, pagination and any new endpoints before implementation.
