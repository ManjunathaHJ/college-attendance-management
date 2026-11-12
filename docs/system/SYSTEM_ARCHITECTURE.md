# System Architecture — College Attendance Management System

## 1. System overview

The College Attendance Management System is a web application for managing student and faculty accounts, class offerings, class sessions, attendance records, and attendance-correction requests. It uses a Next.js application for the presentation and server/API layers, PostgreSQL as the primary relational datastore, and MongoDB as a supplementary datastore currently demonstrated through a database connectivity check and seeded audit-log documents.

This document describes the architecture visible in the repository source. It does not imply that runtime behaviour has been tested in this environment.

## 2. Technology stack

| Layer | Technology | Repository evidence / responsibility |
|---|---|---|
| Web framework and server | Next.js 16 App Router | `src/app/` pages and Route Handlers under `src/app/api/` |
| UI | React 19, TypeScript | Client-rendered dashboard and workflow pages |
| Styling | Tailwind CSS 4 | `src/app/globals.css`, utility classes in page components |
| Authentication | `bcryptjs`, `jose` | Password hash comparison; signed JWT session |
| Relational database driver | `pg` | PostgreSQL connection pool in `src/lib/postgres.ts` |
| NoSQL database driver | `mongodb` | MongoDB client in `src/lib/mongodb.ts` |
| Relational database | PostgreSQL 17 | Users, profiles, subjects, offerings, sessions, attendance, corrections |
| NoSQL database | MongoDB 8 | `audit_logs` seed/demo documents and connectivity ping |
| Local infrastructure | Docker Compose | PostgreSQL and MongoDB containers with persistent named volumes |

## 3. High-level architecture

```mermaid
flowchart TB
    U["Users<br/>Admin / Faculty / Student"]
    B["Web browser"]
    subgraph APP["Next.js application"]
      UI["React UI pages<br/>src/app"]
      API["Next.js Route Handlers<br/>src/app/api"]
      AUTH["Authentication and authorization<br/>JWT + role checks"]
      PGCLIENT["PostgreSQL access layer<br/>pg Pool"]
      MGCLIENT["MongoDB access layer<br/>MongoClient"]
    end
    subgraph DATA["Docker Compose data services"]
      PG[("PostgreSQL 17<br/>attendance_db")]
      MG[("MongoDB 8<br/>audit_logs database/collection")]
      PV[("postgres_data volume")]
      MV[("mongodb_data volume")]
    end
    U --> B --> UI
    UI <-->|HTTP / JSON| API
    API --> AUTH
    API --> PGCLIENT --> PG
    API --> MGCLIENT --> MG
    PG --- PV
    MG --- MV
```

The browser communicates with the Next.js application using HTTP requests to the application's API routes. The API routes perform authentication/authorization checks where implemented, validate request data, execute database queries, and return JSON responses. The application connects to the databases from the server side; browser components do not connect directly to PostgreSQL or MongoDB.

## 4. Application layers

### 4.1 Presentation layer

The UI is implemented as Next.js App Router pages in `src/app/`.

| Page / route | Main purpose |
|---|---|
| `/login` | Collects email and password and submits to `/api/auth/login` |
| `/` | Checks the current session and redirects by role |
| `/admin` | Admin overview and management navigation |
| `/admin/students` | Student management interface |
| `/admin/faculty` | Faculty management interface |
| `/faculty` | Faculty dashboard and assigned-work summary |
| `/students` | Student dashboard and attendance summary |
| `/attendance` | Faculty session creation and attendance management; Admin can view attendance |
| `/my-attendance` | Student attendance history |
| `/corrections` | Student request submission/tracking; Faculty review; Admin view-only listing |

The pages use React client components and call same-origin API routes with `fetch()`.

### 4.2 Backend/API layer

Next.js Route Handlers implement server-side operations.

| API route | Methods | Responsibility |
|---|---|---|
| `/api/auth/login` | POST | Looks up active account, verifies password hash, issues JWT cookie |
| `/api/auth/logout` | POST | Clears the session cookie |
| `/api/auth/me` | GET | Validates session and returns the current user |
| `/api/students` | GET, POST | Admin-only student listing and creation |
| `/api/faculty` | GET, POST | Admin-only faculty listing and creation |
| `/api/sessions` | GET, POST | Lists accessible offerings; Faculty creates sessions for assigned offerings |
| `/api/attendance` | GET, POST | Retrieves role-scoped attendance; Faculty records attendance |
| `/api/corrections` | GET, POST, PATCH | Lists role-scoped requests; Student submits; Faculty approves/rejects through the stored procedure |
| `/api/dashboard` | GET | Returns student/faculty counts, attendance rate, pending requests and recent attendance |
| `/api/db-test` | GET | Pings PostgreSQL and MongoDB and reports connection status |

### 4.3 Authentication and authorization

- Login queries PostgreSQL `users` for an active account and compares the supplied password with `password_hash` using `bcryptjs`.
- On successful login, `jose` signs a JWT using `JWT_SECRET`.
- The JWT is stored in the `attendance_session` cookie with `httpOnly`, `sameSite=lax`, an eight-hour lifetime, and `secure` enabled in production.
- `src/lib/authorization.ts` reads and verifies the cookie and exposes `getCurrentUser()` and `hasRole()`.
- API handlers apply role checks to protected operations. For example, student/faculty creation is Admin-only; attendance marking and session creation are Faculty-only; correction submission is Student-only; correction review is Faculty-only.
- The role-access test script checks several authenticated and unauthenticated API access cases. Test execution is separate from source inspection.

**Implementation note requiring separate verification:** `src/app/api/dashboard/route.ts` currently performs dashboard queries without calling `getCurrentUser()` or `hasRole()`. Do not describe that endpoint as server-side authenticated until this is reviewed and corrected. The Admin page checks the role in the client, but client-side routing is not a substitute for API authorization.

### 4.4 Data access layer

- `src/lib/postgres.ts` creates a reusable `pg.Pool` using `DATABASE_URL`.
- `src/lib/mongodb.ts` creates a MongoDB client connection using `MONGODB_URI`.
- The database connectivity endpoint uses `DATABASE_URL`, `MONGODB_URI`, and `MONGODB_DATABASE`.
- Database credentials and JWT secrets belong in a local `.env.local` file and must not be committed.

## 5. Database architecture and responsibilities

### PostgreSQL — primary system of record

PostgreSQL stores the structured records and relationships required for the attendance workflow:

- `users`, `students`, `faculty`
- `subjects`, `class_offerings`, `enrollments`
- `class_sessions`, `attendance_records`
- `correction_requests`

The application uses relational joins to retrieve class, student, subject, attendance and correction data. The SQL layer also defines integrity constraints, indexes, an attendance-validation trigger/function, and the `review_correction_request` stored procedure. The attendance API uses an explicit transaction when saving a set of attendance rows. The correction-review API calls the stored procedure.

### MongoDB — supplementary document datastore

The repository includes:
- a MongoDB client helper (`src/lib/mongodb.ts`);
- a `/api/db-test` endpoint that pings MongoDB;
- `database/mongodb-seed.js`, which inserts sample `audit_logs` documents and creates indexes and an aggregation example.

**Current integration boundary:** the inspected application routes do not demonstrate writing audit documents to MongoDB during real attendance or correction actions. Describe MongoDB as configured supplementary storage with seed/demo audit records and a connectivity check, not as proven live audit-event integration.

## 6. Docker architecture

`docker-compose.yml` defines two services:

| Service | Image | Container name | Host port | Persistent volume |
|---|---|---|---|---|
| `postgres` | `postgres:17` | `attendance-postgres` | `5432` | `postgres_data` mounted at `/var/lib/postgresql/data` |
| `mongodb` | `mongo:8` | `attendance-mongodb` | `27017` | `mongodb_data` mounted at `/data/db` |

PostgreSQL is configured with database `attendance_db`, user `attendance_user`, and the compose-file development password `attendance_pass`. Its health check uses `pg_isready`. MongoDB is exposed on port `27017`. The named volumes preserve database files when containers are recreated.

The Next.js application is not defined as a Docker Compose service in the inspected compose file. It is run separately using the Node.js/npm scripts.

## 7. Configuration

The source expects these environment variables:

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | `src/lib/postgres.ts` | PostgreSQL connection string |
| `MONGODB_URI` | `src/lib/mongodb.ts` | MongoDB connection URI |
| `MONGODB_DATABASE` | `/api/db-test` | MongoDB database name for ping |
| `JWT_SECRET` | `src/lib/auth.ts` | Secret used to sign and verify session JWTs |
| `NODE_ENV` | Login/logout cookie settings | Controls secure-cookie behaviour in production |

A local `.env.local` should be created from the actual development environment values. Do not put real credentials or production secrets in source control. The repository's Compose credentials are development defaults, not production-grade secrets.

## 8. Runtime setup

Prerequisites:
- Node.js compatible with the project's Next.js version.
- npm (a `package-lock.json` is present).
- Docker Desktop with Docker Compose for the configured database services.

From the repository root:

```bash
npm install
docker compose up -d
```

Create `.env.local` with the required values. For the Compose defaults, a PostgreSQL connection string generally has this form:

```dotenv
DATABASE_URL=postgresql://attendance_user:attendance_pass@localhost:5432/attendance_db
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=attendance_db
JWT_SECRET=replace-with-a-long-random-development-secret
```

Initialize PostgreSQL using the repository SQL scripts in this order:

1. `database/schema.sql`
2. `database/correction_update.sql`
3. `database/advanced.sql`
4. `database/seed.sql`

The order matters because the stored procedure in `advanced.sql` references `correction_requests.requested_status`, added by `correction_update.sql`.

Start the application:

```bash
npm run dev
```

Open `http://localhost:3000`. The database connectivity endpoint is `http://localhost:3000/api/db-test`.

The seed script contains placeholder password-hash strings and hard-coded IDs. Do not assume its accounts can log in until valid password hashes and the corresponding demo data have been configured and verified.

## 9. Main end-to-end workflows

### Authentication
1. User submits email and password on `/login`.
2. `/api/auth/login` retrieves the active user from PostgreSQL.
3. `bcryptjs` verifies the password hash.
4. The server signs a JWT and sets the `attendance_session` cookie.
5. The home route checks `/api/auth/me` and redirects according to the role.

### Admin management
1. Admin signs in.
2. Admin dashboard loads summary data and navigation.
3. Admin lists or creates student and faculty records.
4. Creation inserts the `users` row and related `students` or `faculty` profile in one PostgreSQL transaction.

### Faculty attendance
1. Faculty signs in and retrieves assigned class offerings.
2. Faculty creates a class session for an assigned offering.
3. Faculty selects the session and loads enrolled students.
4. Faculty assigns `PRESENT`, `ABSENT`, or `LATE` statuses.
5. The API checks the faculty assignment and inserts attendance records in a transaction.
6. The database trigger validates session, enrolment and assigned faculty rules.

### Student attendance and correction
1. Student signs in and retrieves only their own attendance records.
2. Student views attendance history and attendance percentage.
3. Student selects an attendance row, requested status and reason.
4. The API verifies that the attendance record belongs to the authenticated student before inserting a pending correction request.
5. Faculty views requests for assigned classes and approves or rejects a pending request.
6. The API calls `review_correction_request`; on approval the procedure updates the attendance status and review metadata. On rejection it records the decision without changing the attendance status.

## 10. Known boundaries and documentation accuracy

- The current `docker-compose.yml` runs the database services only; the Next.js app runs separately.
- MongoDB seed documents are demonstrations; live application writes to `audit_logs` were not found in the inspected routes.
- No runtime test result is claimed by this document.
- `/api/dashboard` lacks a server-side role/authentication check in the inspected source and should be reviewed as a security issue.
- The SQL seed uses placeholder password hashes; demo login credentials must be established and tested separately.
- The database scripts must be executed in the documented order.

## 11. Evidence to capture during final verification

Capture screenshots only after running the application and databases:
- Docker Desktop or `docker compose ps` showing PostgreSQL and MongoDB healthy/running.
- `/api/db-test` response showing both database connections.
- Login and dashboards for Admin, Faculty and Student.
- Admin student/faculty management.
- Faculty session creation and attendance submission.
- Student attendance history and correction request submission.
- Faculty correction approval/rejection.
- PostgreSQL table/query evidence and MongoDB seed documents.
- Automated role-access test output.

Do not present source-code diagrams or expected results as proof of a running system.
