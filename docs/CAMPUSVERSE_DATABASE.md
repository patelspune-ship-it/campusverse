# CampusVerse Database

Database: MongoDB database name `CampusVerseDB`, accessed with Mongoose (`server/server.js`). Mongoose does not add timestamps unless each schema declares them.

## Models

| Model | Fields and rules | Relationships / indexes |
|---|---|---|
| **User** | `userId` string required/unique; optional email/mobile/password; role enum default student; nullable name/department/year; boolean profile and forced-password flags default false. | `institute_id -> Institute`, `club_id -> Club`, `division_id -> Division`, `faculty_id -> Faculty`; schema does not enable timestamps. |
| **Club** | Required/unique name; nullable institute, category enum, description, logo/banner URLs, social/contact fields, founded year; `profile_completed=false`. | `institute_id -> Institute`; `created_at`, `updated_at`. |
| **Event** | Required name, description, date, start/end time strings, venue, max participants, category enum, club ID. Fee defaults 0; poster nullable. Status enum defaults pending; rejection reason nullable; retroactive/past fields; certificate-generation flags. | `club_id -> Club`; `created_at`, `updated_at`. No schema index beyond `_id`. |
| **Registration** | Required student/event IDs; entry/exit flags/dates, attendance enum default `not_attended`, duration; nullable QR and certificate fields. | `student_id -> User`, `event_id -> Event`; unique compound `{ student_id, event_id }`; `registered_at` only. |
| **Institute** | Required unique `name` and `code`. | `created_at` only; referenced by users/clubs/divisions/faculty. |
| **Division** | Required institute, department, year enum FY/SY/TY/BTech, division code, semester, academic year; nullable class teacher. | `institute_id -> Institute`, `class_teacher_faculty_id -> Faculty`; unique `{ institute_id, division_code }`; created/updated timestamps. |
| **Faculty** | Required unique user and faculty code, full name, institute, department; string-array subjects and false class-teacher flag. | `user_id -> User`, `institute_id -> Institute`; created/updated timestamps. |
| **Timetable** | Required division, weekday enum Monday–Saturday, start/end time, and slot type enum; optional subject/code/faculty/room. | `division_id -> Division`, `faculty_id -> Faculty`; indexes `{division_id,day}` and `{faculty_id,day}`; created/updated timestamps. |
| **AttendanceVerificationRequest** | Required student/faculty/event/registration/timetable slot and denormalized lecture/event data; status enum default pending, approval/rejection fields. | references User, Faculty, Event, Registration, Timetable; indexes `{faculty_id,status}`, `{student_id,event_id}`, unique `{student_id,event_id,timetable_slot_id}`; `created_at` only. |

## Actual relationship flow

```text
Institute <- User (student/faculty), Club, Division, Faculty
User (student) <- Registration -> Event -> Club
User (student) -> Division -> Timetable <- Faculty
full Registration + overlapping Timetable lecture
  -> AttendanceVerificationRequest -> Faculty action
```

Certificates and QR codes are stored as URL/token attributes on `Registration`, not separate models. The certificate service generates certificates for full attendance; the routing service creates verification requests when a full-attendance student overlaps a teaching slot.

## Important rules observed in routes/services

- A student can register once per event; capacity is checked before creation.
- Approved future events are publicly shown/registrable; an event is created pending and club admins may edit only pending events.
- A past event is entered retroactively only with a past date and status `completed`.
- Entry marks attendance `partial`; exit requires entry and marks `full`, computing duration. A full registration may generate a certificate.
- Verification creation is idempotent per student/event/timetable slot.
- Mongoose required fields and enum restrictions are the only schema-level validations observed; no general request-validation middleware exists.

## Data risks requiring confirmation

- Route aggregations in `server/routes/admin.js` reference non-schema fields `eventId` and `userId` on Registration instead of `event_id` / `student_id`; registration counts are likely inaccurate.
- Most references do not declare database-level cascading behavior. Deleting parent data behavior is UNKNOWN — REQUIRES HUMAN CONFIRMATION.
- Indexing for common public date/category/institute filtering and event listing is limited; production data scale is UNKNOWN — REQUIRES HUMAN CONFIRMATION.
