# College Attendance Management System

A role-based web application for managing student attendance, class sessions, attendance records, and correction requests. The system provides separate interfaces and permissions for administrators, faculty members, and students.

## 1. Project Overview

The College Attendance Management System digitizes the attendance management process within a college. It enables faculty members to create class sessions and record student attendance, students to monitor their attendance and request corrections, and administrators to manage student and faculty information.

The application uses PostgreSQL as its primary relational database and MongoDB for supplementary audit-log demonstrations.

## 2. Key Features

- **Role-based access:** Separate functionality for Admin, Faculty, and Student users.
- **Authentication:** Secure login using password hashing and JWT-based sessions.
- **Student management:** Administrators can create and manage student accounts.
- **Faculty management:** Administrators can create and manage faculty accounts.
- **Class session management:** Faculty members can create sessions for their assigned subjects.
- **Attendance management:** Faculty members can mark attendance for enrolled students.
- **Attendance tracking:** Students can view their attendance history and percentage.
- **Correction requests:** Students can request attendance corrections, which faculty members can review and approve or reject.
- **Database validation:** SQL constraints, indexes, triggers, and stored procedures help maintain data integrity.

## 3. User Roles

| Role | Responsibilities |
|---|---|
| Admin | Manage student and faculty accounts, view system information and attendance data. |
| Faculty | Create class sessions, mark attendance, and review correction requests for assigned classes. |
| Student | View personal attendance records and submit correction requests. |

## 4. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React 19, Next.js 16 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Next.js App Router API routes |
| Primary Database | PostgreSQL 17 |
| Supplementary Database | MongoDB 8 |
| Database Libraries | `pg`, `mongodb` |
| Authentication | JWT (`jose`) |
| Password Hashing | `bcryptjs` |
| Containerization | Docker Compose |

## 5. System Architecture

The application follows a layered architecture:

1. **Presentation Layer:** React-based interfaces for administrators, faculty, and students.
2. **Application Layer:** Next.js API routes handle authentication, authorization, attendance operations, and correction requests.
3. **Data Access Layer:** PostgreSQL and MongoDB clients manage database communication.
4. **Database Layer:** PostgreSQL stores core application data, while MongoDB supports supplementary audit-log demonstrations.

For a detailed explanation, refer to:

- [System Architecture](docs/system/SYSTEM_ARCHITECTURE.md)
- [System Workflow](docs/system/SYSTEM_WORKFLOW.md)

## 6. Database Design

### PostgreSQL

PostgreSQL is the primary database and stores the core application entities:

- Users
- Students
- Faculty
- Subjects
- Class Offerings
- Enrollments
- Class Sessions
- Attendance Records
- Correction Requests

The database uses primary keys, foreign keys, unique constraints, check constraints, and indexes to maintain consistency and improve query performance.

Additional database functionality includes:

- Attendance validation trigger.
- Attendance validation function.
- Correction request review procedure.
- Transaction-based operations for related database updates.

### MongoDB

MongoDB is used for supplementary audit-log demonstrations through the `audit_logs` collection. The provided seed script inserts sample audit events, creates indexes, and demonstrates aggregation.

Live application-level audit-log writing has not yet been verified.

For detailed database documentation, refer to:

- [Database Documentation](docs/database/DATABASE_DOCUMENTATION.md)
- [Relational Schema](docs/database/RELATIONAL_SCHEMA.md)
- [ER Diagram](docs/database/ER_DIAGRAM.md)

## 7. Project Structure

```text
college-attendance-management/
│
├── database/
│   ├── schema.sql
│   ├── correction_update.sql
│   ├── advanced.sql
│   ├── transactions.sql
│   ├── seed.sql
│   └── mongodb-seed.js
│
├── docs/
│   ├── database/
│   └── system/
│       ├── README_SYSTEM_SECTION.md
│       ├── SYSTEM_ARCHITECTURE.md
│       └── SYSTEM_WORKFLOW.md
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── admin/
│   │   ├── faculty/
│   │   ├── students/
│   │   ├── attendance/
│   │   ├── corrections/
│   │   └── my-attendance/
│   │
│   └── lib/
│       ├── auth.ts
│       ├── authorization.ts
│       ├── postgres.ts
│       └── mongodb.ts
│
├── tests/
├── docker-compose.yml
├── package.json
└── README.md
```

## 8. Prerequisites

Install the following before running the project:

- Node.js 20 or later.
- npm.
- Docker Desktop with Docker Compose.
- Git.

## 9. Installation and Setup

### Step 1: Clone the repository

```bash
git clone https://github.com/ManjunathaHJ/college-attendance-management.git

cd college-attendance-management
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Start the database services

```bash
docker compose up -d
```

Check whether the containers are running:

```bash
docker compose ps
```

The Docker Compose configuration starts:

- PostgreSQL on port `5432`.
- MongoDB on port `27017`.

The Next.js application runs separately.

### Step 4: Configure environment variables

Create a `.env.local` file in the project root.

Add the following configuration and replace the placeholders where necessary:

```env
DATABASE_URL=postgresql://attendance_user:attendance_pass@localhost:5432/attendance_db

MONGODB_URI=mongodb://localhost:27017

MONGODB_DATABASE=your_mongodb_database

JWT_SECRET=replace_with_a_long_random_secret

NODE_ENV=development
```

Ensure that the PostgreSQL credentials match the Docker Compose configuration and that the MongoDB database name matches the application configuration.

Do not commit `.env.local` or expose production secrets.

### Step 5: Initialize the PostgreSQL database

Execute the SQL scripts in the following order:

1. `database/schema.sql`
2. `database/correction_update.sql`
3. `database/advanced.sql`
4. `database/seed.sql`

The order is important because later scripts depend on objects created by earlier scripts.

**Note:** The provided seed script uses placeholder password hashes and hardcoded IDs. Replace or configure these appropriately before attempting to use seeded accounts for authentication. Avoid rerunning the seed script against an already populated database without checking for duplicate records.

### Step 6: Initialize MongoDB sample data

Run the supplementary seed script:

```bash
mongosh mongodb://localhost:27017/your_mongodb_database database/mongodb-seed.js
```

Replace the database name with the value configured in `MONGODB_DATABASE`.

### Step 7: Start the application

```bash
npm run dev
```

Open the application in your browser:

```text
http://localhost:3000
```

## 10. API Routes

The application exposes API routes through the Next.js App Router.

| API Endpoint | Purpose |
|---|---|
| `/api/auth/login` | Authenticate users. |
| `/api/auth/logout` | End the authenticated session. |
| `/api/auth/me` | Retrieve the current authenticated user. |
| `/api/attendance` | Retrieve and record attendance. |
| `/api/corrections` | Submit, retrieve, and review correction requests. |
| `/api/dashboard` | Retrieve dashboard information. |
| `/api/faculty` | Retrieve and create faculty records. |
| `/api/sessions` | Retrieve and create class sessions. |
| `/api/students` | Retrieve and create student records. |
| `/api/db-test` | Check database connectivity. |

Refer to the individual route handlers under `src/app/api/` for request parameters, response formats, and implementation details.

## 11. Authentication and Security

The application implements:

- Password hashing using `bcryptjs`.
- JWT-based authentication using `jose`.
- HTTP-only session cookies.
- Eight-hour token expiration.
- Role-based authorization for protected operations.
- Server-side validation for attendance and correction operations.
- PostgreSQL transactions for related database updates.

The JWT secret must be configured through the environment rather than hardcoded into the application.

## 12. Testing

The repository contains a role-access test script:

```bash
node tests/role-access-test.mjs
```

Run the application and required database services before executing tests that depend on the running application.

Test results should be recorded after execution; this README does not claim that all tests have passed.

## 13. Documentation

Detailed project documentation is available in the `docs/` directory.

| Document | Description |
|---|---|
| `docs/system/SYSTEM_ARCHITECTURE.md` | System components, architecture, technologies, and configuration. |
| `docs/system/SYSTEM_WORKFLOW.md` | Admin, faculty, student, attendance, and correction workflows. |
| `docs/database/DATABASE_DOCUMENTATION.md` | Database implementation and functionality. |
| `docs/database/RELATIONAL_SCHEMA.md` | Relational tables, keys, and constraints. |
| `docs/database/ER_DIAGRAM.md` | Entity Relationship Diagram. |

## 14. Future Enhancements

Potential improvements include:

- Live application-level audit logging in MongoDB.
- More comprehensive automated integration testing.
- Additional reporting and analytics.
- Improved security checks for all dashboard endpoints.
- Production deployment and environment hardening.

## 15. License

This project was developed for academic purposes as part of a Database Management Systems project.
