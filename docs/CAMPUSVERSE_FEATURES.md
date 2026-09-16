# CampusVerse Feature and Web-to-API Mapping

| Feature | Web screens/components | Backend API | Models / rules |
|---|---|---|---|
| Public event discovery/filtering | `Home.tsx`, `EventCard.tsx`, `Header.tsx` | `GET /public/events/upcoming`, student event IDs, registration POST | Event/Club/Registration; only approved future non-past events displayed; client filters search/category/institute. |
| Student registration and QR | `EventCard.tsx`, `Dashboard.tsx` | register/cancel/status; `GET /student/my-registrations` | Registration unique per student/event, capacity and date/status checks; QR generated asynchronously to Cloudinary. |
| Student dashboard | `Dashboard.tsx` | student stats, registrations, attended events, verification requests | Registration/Event/AVR; shows QR, attendance and certificate status. |
| Student certificates / public validation | `student/Certificates.tsx`, `CertificateVerify.tsx` | certificates; public verify | Registration/Event/User/Club; only full attendance certificate output. |
| Authentication / forced password | `Auth.tsx`, `ChangePassword.tsx`, `useAuth.ts` | auth register/login/change-password | User/Faculty; students self-register, all roles log in by userId. |
| Club browse/detail | `Clubs.tsx`, `ClubCard.tsx`, `ClubDetail.tsx` | public clubs, club detail | Club/Institute/Event/Registration; route response/client expectation mismatch noted in architecture audit. |
| Club profile/branding | `club/Profile.tsx`, `ClubLayout.tsx` | club me/institutes/profile | User/Club/Institute; images Cloudinary; completion needs category+description+logo. |
| Club event lifecycle | club dashboard/events/create/add-past/past/event-detail | club events create/list/edit/cancel/attendees | Event/Registration; submitted events pending, only pending editable, past event separately entered. |
| Live attendance scanning | `club/Scanner.tsx` | scanner events/attendees; attendance entry/exit | Registration/Event/User; QR signature + club ownership; exit triggers certificates/routing. |
| Super-admin moderation/reporting | admin dashboard/approvals/all events/clubs/students/institutes/verifications | entire `/admin/*` group | Event/Club/User/Institute/Registration/AVR; approve/reject event flows. |
| Faculty attendance verification | faculty dashboard/pending/approved/rejected/timetable | `/faculty/*` | Faculty/Timetable/AVR; faculty can act only on their own pending requests. |

No implemented UI/API feature was found for announcements, in-app notifications, favorites/bookmarks, payments, email delivery, user profile editing for students, institute CRUD, club creation, user management mutation, or real-time sockets.

## Frontend-to-backend flow examples

```text
Home -> EventCard -> POST /api/events/:id/register -> verifyToken + student RBAC
     -> Registration create -> QR background upload -> JSON -> card/dashboard state

Club Scanner -> POST /api/attendance/exit -> JWT + role + ownership check
     -> Registration full attendance -> certificate service + timetable routing -> response

Faculty Pending -> PATCH /api/faculty/verifications/:id/approve -> faculty router
     -> ownership/status filter on AVR -> approved JSON -> row removed locally
```

The full endpoint-level consumer mapping is in `CAMPUSVERSE_API.md`.
