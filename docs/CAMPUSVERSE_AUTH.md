# CampusVerse Authentication and Authorization

## Implemented flow

1. Student self-registration: `POST /api/auth/register` checks duplicate `userId` and optional email, bcrypt-hashes the supplied password with 10 rounds, creates a `student` User, then returns a seven-day JWT and a limited user object.
2. Login: `POST /api/auth/login` finds by `userId`, bcrypt-compares the password, resolves a faculty profile ID if necessary, and returns a seven-day JWT plus user data.
3. Web persistence: `src/hooks/useAuth.ts` and `src/pages/Auth.tsx` store `cv_token` and serialized `cv_user` in browser `localStorage`.
4. Requests: `src/lib/api.ts` adds `Authorization: Bearer <cv_token>` to JSON and multipart calls.
5. Server verification: `verifyToken` uses `JWT_SECRET`, assigns its decoded `{ id, role, institute_id, club_id, faculty_id, must_change_password }` payload to `req.user`, or returns 401.
6. Role authorization: `requireRole` grants specified roles; `super_admin` bypasses every role restriction.
7. Logout: client-only deletion of those two localStorage keys; no server token revocation or blacklist.
8. Password change: authorized `POST /api/auth/change-password` needs an 8+ character replacement and clears `must_change_password`.

Roles actually modeled: `student`, `club_admin`, `faculty`, `super_admin`. Club, faculty and admin routers enforce their named role globally. Event registration requires `student`. Attendance entry/exit allows club admin, faculty or super admin. The QR pre-check endpoint has no authentication.

## Browser route protection

`ClubLayout`, `AdminLayout`, and `FacultyLayout` read `cv_user`, redirect for a missing/wrong role, and redirect forced-password users. This is usability protection only: API authorization is the security boundary. Public/some shared routes are not uniformly client-guarded, so each mobile screen must verify the server response and current role.

## Mobile use of the existing backend

React Native can directly use the current API:

- Login/register against the same JSON endpoints.
- Store the returned JWT and user record in device secure storage, not AsyncStorage/localStorage for the token.
- Add the existing `Authorization: Bearer <token>` header on protected requests.
- Use `multipart/form-data` with the existing field names (`poster`, `logo`, `banner`) for image uploads.
- On HTTP 401, clear secure storage and return to the authentication stack; JWTs expire after 7 days. No refresh endpoint exists, so re-login is required.

## Mobile compatibility assessment

| Area | Classification | Evidence / impact |
|---|---|---|
| Bearer JWT API authentication | SAFE | Token is returned in JSON and server reads an Authorization header; no cookie is required. |
| Token storage | MINOR ADAPTATION | Web-specific `localStorage` and `window.location` must be replaced by SecureStore/Keychain/Keystore and a configured native API base URL. |
| CORS | SAFE for native / RISK for web builds | Native requests normally have no browser Origin and server explicitly permits no-origin requests. A new hosted web origin is not permitted unless server CORS is changed. |
| Login refresh/session renewal | BACKEND CHANGE REQUIRED for seamless long-lived sessions | JWT only, seven-day expiry, no refresh token/revocation endpoint. |
| Device API address | MINOR ADAPTATION | `localhost` refers to the phone/emulator, not the server. Current Vite proxy cannot serve a native app. |
| Must-change-password enforcement | RISK | Flag is only redirected in role layouts; mobile must enforce it after login. Backend does not block other protected routes based on this flag. |
| QR payload exposed to student API | RISK | `GET /api/student/my-registrations` returns `qr_token`; a mobile app should render it but avoid logging/exporting it. |

## Security observations

- **CRITICAL** — `.env`: `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID` are in a committed environment file. Publishable values may be intentionally public, but repository policy/expected rotation is UNKNOWN — REQUIRES HUMAN CONFIRMATION.
- **CRITICAL** — `server/.env`: `MONGO_URI`, `JWT_SECRET`, `QR_SECRET`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` are committed. These are server credentials/secrets and should be treated as exposed/rotated by an authorized maintainer. Values are intentionally not reproduced here.
- **HIGH** — JWT is held in web localStorage, vulnerable to an XSS token-exfiltration class of attack. This does not block native use when SecureStore is used.
- **MEDIUM** — No explicit rate limiting, login throttling, password complexity beyond change-password length, refresh/revocation, or centralized error handling was found.
- **MEDIUM** — Multer validates MIME prefix and 5 MB size but does not inspect file contents; Cloudinary upload errors surface as generic 500 responses.
- **MEDIUM** — `super_admin` bypasses all `requireRole` restrictions by design. Ensure account provisioning and JWT secret control are strict.

No actual secret value was read or included in this audit.
