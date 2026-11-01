# Medicart

A local medical center staff workspace with a React + TypeScript interface, Express API, and persistent SQLite database. Includes an overview dashboard, patient and doctor management, 30-minute appointment scheduling, and medical center settings. All seed records are fictional.

## Requirements and setup

Use **Node.js 22.19 or newer** (the server uses the built-in `node:sqlite` API) and npm.

```powershell
npm ci
Copy-Item .env.example .env
```

Edit `.env`, set `STAFF_EMAIL` and a unique `STAFF_PASSWORD` of at least 12 characters, then initialize the database and staff account:

```powershell
npm run seed
npm run dev
```

Open **http://127.0.0.1:5173** and sign in with your configured staff credentials. The API listens on **http://127.0.0.1:3001**. Vite proxies `/api` to the backend, so browser requests are same-origin. An available alternative Vite port is printed if 5173 is occupied.

The database and schema initialize automatically at startup. `npm run seed` creates 12 fictional patients, 5 doctors, 28 appointments relative to the current center date, and a staff account. Repeating the seed command preserves existing records, adds missing stable seed IDs (skipping slots already occupied by other records), and **resets the configured account's password**. Use the same command to rotate a staff password; existing sessions for that account are revoked immediately. To create another staff account, change `STAFF_EMAIL` and `STAFF_PASSWORD`, then run the seed command again. Seeding is an explicit action; the server never creates a default password.

## Commands

```powershell
npm run dev     # API watcher and Vite frontend together
npm run lint    # TypeScript, React hooks, and server lint
npm test        # Validation, authentication, relationships, scheduling, API tests
npm run build  # Type checking and optimized frontend build
npm start      # API and built frontend together at http://127.0.0.1:3001
```

Run `npm run build` before `npm start`. The existing root `app.js`, `app.test.js`, and legacy build helper are retained; the original root test is included in `npm test`. GitHub Actions now uses the required Node version and runs build, lint, and tests. Its delivery job only uploads a frontend artifact; it does not deploy the API or database.

## Configuration

| Variable          | Purpose                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `PORT`            | API and production local server port, default `3001`. If changed, update Vite's proxy target in `vite.config.mts`. |
| `DATABASE_PATH`   | SQLite file, default `./data/medicart.sqlite`. Its parent directory is created automatically.                      |
| `CENTER_TIMEZONE` | Initial IANA medical center timezone, default `Asia/Colombo`. After initialization, change it in Settings.         |
| `STAFF_EMAIL`     | Account created or updated by the explicit seed command.                                                           |
| `STAFF_PASSWORD`  | Seed command password; at least 12 characters, stored only as a salted scrypt hash.                                |
| `COOKIE_SECURE`   | Default `false` for local HTTP. Set `true` for HTTPS.                                                              |

`.env`, database files, and local runtime data are ignored by Git. Keep the database on a local disk; SQLite WAL is not intended for network filesystems. Back up the database consistently with SQLite-aware backup tooling, including WAL state; do not copy only an actively changing `.sqlite` file.

## Architecture

- `src/app/`: application shell, routing, login session lifecycle, workspace provider, responsive styles.
- `src/features/`: dashboard, patients, doctors, appointments, and settings. Feature-specific table definitions, fields, filtering, and profiles live with their feature.
- `src/shared/`: reusable record workflow, accessible native dialog, fields, tables, pagination, avatars, status badges, typed records, API client, timezone/date helpers, and CSV export.
- `server/domain.cjs`: server-side Zod schemas, timezone handling, and appointment rules independent of HTTP.
- `server/database.cjs`: SQLite schema, constraints, relationships, and data access.
- `server/auth.cjs`: password hashing and token hashing.
- `server/app.cjs`: protected HTTP routes, error boundary, session authentication, login rate limiting, security headers, and origin checks.
- `server/tests/`: isolated in-memory SQLite integration tests with real HTTP middleware and business rules.

The client loads a bounded local-center workspace dataset in one protected bootstrap request and filters/paginates it locally. This keeps all views consistent after mutations. For large installations, move filtering, aggregation, and pagination into server-side queries.

## Workflows and business rules

- Dashboard metrics, date filters, weekly activity, recent registrations, and upcoming visits derive from persisted records. There are no invented growth percentages.
- Patients include calculated age, full contact details, notes, search, gender filter, pagination, profile and visit history. Doctors include specialty, fees in LKR, day/time availability, and active status.
- Records have stable, server-generated IDs. Archiving removes a patient or doctor from current lists and future booking choices while retaining their details and appointment relationships. Archived records can be inspected through the archived filter, but cannot be edited. There is no restore workflow in this version.
- Visits last **30 minutes**. Overlap checks account for partial overlaps and exclude cancelled visits. Back-to-back appointments are allowed; different doctors may see patients at the same time.
- New appointments must be Scheduled or Confirmed, strictly in the future, within both center and doctor availability, and linked to an unarchived patient and active doctor. Future visits cannot be marked Completed. Existing historical visits can be annotated or cancelled without moving their saved slot.
- Edit an appointment to reschedule or change its status. Cancellation preserves the record and frees the slot. Permanent deletion is a separate confirmed action available only for cancelled appointments.
- Foreign keys prevent dangling patient/doctor references. SQLite constraints also enforce allowed statuses, required columns, and nonnegative fees. Request validation returns consistent `{error, fields?}` responses.
- All appointment dates/times are **medical-center wall-clock values**, using the persisted IANA timezone for comparisons and dashboard calculations. Settings changes affect new/rescheduled visits; existing visits retain their saved wall-clock values. Timezone changes should be coordinated with staff. This version does not disambiguate repeated or nonexistent wall times during daylight-saving transitions; the default `Asia/Colombo` has no DST.
- Search is available in each list; the top search finds patients. Export downloads the current filtered list as CSV, with spreadsheet formula escaping. Exports contain personal information if real data is entered; handle them appropriately.

## Authentication and scope

Passwords are scrypt-hashed with random salts. Authentication uses random eight-hour session tokens in `HttpOnly`, `SameSite=Strict` cookies; only token hashes are stored in SQLite. Sign-out revokes the current session. APIs require a session, reject foreign-origin mutations, do not cache responses, and rate-limit login attempts. The app does not write patient details, credentials, or session tokens to application logs. The server binds to loopback by default. HTTPS cookie mode is configurable for a reviewed hosting setup.

This is a functioning **local application, not a certified or production-ready medical information system**. No infrastructure has been deployed. Before using real patient information, complete security and regulatory review and add the controls appropriate to your environment, including role-based access, audit trails, managed account lifecycle, MFA, recovery, encrypted backups/storage, monitoring, and deployment hardening. Current staff accounts share full access. Login rate limiting is in-process and designed for one server process. SQLite triggers independently enforce appointment non-overlap, including concurrent inserts. Relationship and availability validation is designed for a single local server; review transaction isolation and session/rate-limit storage before scaling to multiple processes. There is no email/SMS reminder, billing, or prescription module.

## Verification

`npm test` exercises required fields, invalid dates/contact details, fees/availability, login/logout/expiry, origin rejection, protected endpoints, CRUD, FK preservation, archiving, invalid relationships, inactive doctors, past visits, partial overlaps, adjacent slots, rescheduling conflicts, unavailable weekdays, opening hours, cancellation/deletion, timezone comparison, and settings persistence. Disk persistence and repeatable seed behavior are also verified. Browser visual verification was unavailable because the browser access host was disconnected and Windows Computer Use could not verify the current URL; desktop/mobile layouts require manual browser review.
