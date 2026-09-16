# CampusVerse API Inventory

Base API mount is `/api`. Protected endpoints require `Authorization: Bearer <JWT>` except where noted. All handlers return JSON. Typical unhandled/operational failure is `500 { message }`; bad IDs can also surface as 500 in handlers without ObjectId validation. Request schemas below reflect implemented route access, not an OpenAPI contract.

## Authentication

| Method / path | Auth | Purpose, inputs and success response | Web consumers | Route/models |
|---|---|---|---|---|
| POST `/auth/register` | Public | Student-only sign-up body: `userId,email,mobile?,password,name?,department?,year?,institute_id?,division_id?`; returns `{message,token,user}`. 409 duplicates, 500. | `Auth.tsx`, `useAuth.ts` | `routes/auth.js`; User |
| POST `/auth/login` | Public | `{userId,password}`; returns `{message,token,user}`. 404 account, 401 password, 500. | `Auth.tsx`, `useAuth.ts` | auth; User, Faculty |
| POST `/auth/change-password` | Any JWT | `{newPassword}` min 8; clears forced change; `{message}`. 400/401/500. | `ChangePassword.tsx` | auth; User |

## Public discovery and certificate verification

| Method / path | Auth | Purpose / response | Web consumers | Route/models |
|---|---|---|---|---|
| GET `/public/events/upcoming` | Public | Approved future, non-retroactive events with populated club and `registrationCount`; 500. | `Home.tsx` | public; Event, Club, Registration |
| GET `/public/clubs` | Public | All clubs with institute and computed `eventCount`; 500. | `Clubs.tsx` | public; Club, Institute, Event |
| GET `/public/clubs/:id` | Public | `{club,upcomingEvents,pastEvents}`; upcoming has count. 404/500. | `ClubDetail.tsx` | public; Club, Event, Registration |
| GET `/public/institutes` | Public | Institute array. | `Home.tsx`, `Clubs.tsx`, `Auth.tsx` | public; Institute |
| GET `/public/divisions` | Public | Divisions populated with institute. | `Auth.tsx` | public; Division, Institute |
| GET `/public/verify/:certId` | Public | Certificate facts and Cloudinary URL if registration certificate exists. 400 missing, 404 invalid, 500. | `CertificateVerify.tsx`; certificate QR external flow | public; Registration, User, Event, Club |

## Student and event registration

| Method / path | Auth | Purpose / inputs / response | Web consumers | Route/models |
|---|---|---|---|---|
| POST `/events/:id/register` | student | Create registration. ID path param; no body. 201 `{message,registration}`; 400 invalid/not open/past/full, 404, 409 duplicate, 500. QR upload runs asynchronously. | `EventCard.tsx` | events; Event, Registration, User; Cloudinary/QR |
| DELETE `/events/:id/register` | student | Cancel own pre-event registration. `{message}`; 400/404/500. | No consumer found | events; Event, Registration |
| GET `/events/:id/is-registered` | Any JWT | `{isRegistered}` for current user. | No consumer found | events; Registration |
| GET `/student/stats` | student | `{eventsRegistered,eventsAttended,certificatesEarned,activeRegistrations}`. | `Dashboard.tsx` | student; Registration, Event |
| GET `/student/my-registrations` | student | Future approved registered events with registration/QR fields. | `Dashboard.tsx`, `EventCard.tsx` | student; Registration, Event, Club |
| GET `/student/my-attended` | student | Past/any attended event facts plus attendance/certificate fields. | `Dashboard.tsx` | student; Registration, Event, Club |
| GET `/student/my-certificates` | student | Certificate card list. | `student/Certificates.tsx` | student; Registration, Event, Club |
| GET `/student/my-verifications` | student | Own faculty attendance-verification requests. | `Dashboard.tsx` | student; AVR, Faculty, Event |
| GET `/student/my-event-ids` | student | Array of registered event ID strings. | `Home.tsx`, `ClubDetail.tsx` | student; Registration |

## Club administrator

All paths in this group require `club_admin` (super-admin middleware bypass applies globally). Multipart image fields accept image MIME types, max 5 MB.

| Method / path | Purpose / inputs / response | Web consumers | Models |
|---|---|---|---|
| GET `/club/ping` | Auth diagnostic `{message,user}`. | None | — |
| GET `/club/me` | Current user (without password) plus club/institute. 404/500. | `ClubLayout.tsx` | User, Club |
| GET `/club/institutes` | Institute dropdown list. | `club/Profile.tsx` | Institute |
| PATCH `/club/profile` | Multipart optional `logo`, `banner`; text category, description, founded_year, institute_id, social/contact fields; returns `{message,club}`. | `club/Profile.tsx` | User, Club, Cloudinary |
| GET `/club/events` | Every event belonging to current club. | club dashboard/events/past pages | User, Event |
| POST `/club/events` | Multipart `poster?` plus required event fields; creates pending event; 201 `{message,event}`. | `club/CreateEvent.tsx` | User, Event, Cloudinary |
| POST `/club/events/past` | Multipart event fields plus past attendance/summary; date must be past; creates completed retroactive event. | `club/AddPastEvent.tsx` | User, Event, Cloudinary |
| PATCH `/club/events/:id` | Multipart optional poster and event fields; only own pending event may change; `{message,event}`. | No consumer found | User, Event, Cloudinary |
| GET `/club/events/scanner-list` | Current club approved events dated within last two days/future; minimal event fields. | `club/Scanner.tsx` | User, Event |
| GET `/club/events/:id/attendees` | Own event plus attendee privacy/attendance fields and stats. | `club/EventDetail.tsx`, `club/Scanner.tsx` | User, Event, Registration |
| PATCH `/club/events/:id/cancel` | Own non-completed/non-cancelled event -> cancelled. `{message,event}`. | `club/Events.tsx`; `admin/AllEvents.tsx` attempts it but lacks role | User, Event |

## Attendance scanning

| Method / path | Auth | Purpose / inputs / response | Web consumers | Models/services |
|---|---|---|---|---|
| POST `/attendance/entry` | club_admin, faculty, super_admin | `{qr_token}`; validates signed QR, event ownership/institute permission, writes partial attendance; returns scan/student/event/time. 400/401/403/404/409/500. | `club/Scanner.tsx` | Registration, Event, User |
| POST `/attendance/exit` | club_admin, faculty, super_admin | `{qr_token}`; requires entry; writes full attendance/duration and asynchronously generates certificate + verification requests. | `club/Scanner.tsx` | Registration, Event, User, certificate/routing services |
| POST `/attendance/verify-qr` | Public | `{qr_token}` precheck; does not write attendance; blocks more than 24h early. | No consumer found | Registration, Event, User |

## Faculty

All require faculty role.

| Method / path | Inputs / response | Web consumers | Models |
|---|---|---|---|
| GET `/faculty/stats` | pending/month actions/student count. | faculty layout/dashboard | Faculty, AVR, Timetable, User |
| GET `/faculty/verifications` | Query `status,subject,event_id,date_from,date_to,search`; max 200 populated requests. | pending/approved/rejected/dashboard | Faculty, AVR, User, Event, Club |
| GET `/faculty/verifications/:id` | One own request. 404/500. | No consumer found | Faculty, AVR, User, Event, Club |
| PATCH `/faculty/verifications/:id/approve` | Pending own request -> approved. | pending/dashboard | Faculty, AVR |
| PATCH `/faculty/verifications/:id/reject` | `{reason}` required -> rejected. | pending | Faculty, AVR |
| POST `/faculty/verifications/bulk-approve` | `{ids: string[]}` -> modified count. | pending | Faculty, AVR |
| GET `/faculty/timetable` | Faculty lecture slots, populated division. | timetable | Faculty, Timetable, Division |
| GET `/faculty/today-schedule` | Today's faculty lecture slots. | dashboard | Faculty, Timetable, Division |

## Super administrator

All require `super_admin`.

| Method / path | Purpose / inputs / response | Web consumers | Models/services |
|---|---|---|---|
| GET `/admin/ping` | Auth diagnostic. | None | — |
| GET `/admin/stats` | platform counts. | admin layout/dashboard | User, Club, Institute, Event |
| GET `/admin/pending-events` | Pending events populated club. | dashboard/approvals | Event, Club |
| PATCH `/admin/events/:id/approve` | approve and clear reason. | dashboard/approvals | Event, Club |
| PATCH `/admin/events/:id/reject` | `{rejection_reason}` required. | dashboard/approvals | Event, Club |
| GET `/admin/events` | Queries `status,club_id,date_from,date_to`; events plus intended registration count. | all events | Event, Registration, Club |
| GET `/admin/clubs` | Queries `institute_id,category,search`; clubs plus counts/admin. | dashboard/all clubs/all events | Club, Event, User, Institute |
| GET `/admin/students` | Queries `search,institute_id`; users (password excluded) plus intended count. | all students | User, Registration, Institute |
| GET `/admin/institutes` | Institutes plus student/club counts. | institutes/all students/all clubs | Institute, User, Club |
| POST `/admin/events/:id/generate-certificates` | Generate full-attendance certificates. | all events | Event, Registration, certificate service |
| POST `/admin/events/:id/create-verifications` | Create timetable overlap verification requests. | No consumer found | Event, routing service |
| GET `/admin/verifications` | Queries `status,faculty_id,date_from,date_to,search`; max 500 results. | verifications | AVR, User, Faculty, Event |
| GET `/admin/verification-stats` | pending/month actions/approval rate/top faculty. | No consumer found | AVR, Faculty |

Root `GET /` responds with a plain API-running string. No versioned API, pagination contract, response envelope, OpenAPI document, or global error handler was found.
