# Database Documentation â€” College Attendance Management System

**Database engine:** PostgreSQL 17  
**Supplementary datastore:** MongoDB 8 (`audit_logs` collection)  
**Source reviewed:** `database/schema.sql`, `database/correction_update.sql`, `database/advanced.sql`, `database/transactions.sql`, `database/seed.sql`, and `database/mongodb-seed.js` on the repository's `master` branch.

> This document describes the SQL currently present in the repository. It distinguishes implemented database objects from items that are not currently present; it does not claim that scripts have been executed successfully.

## 1. Database responsibilities

PostgreSQL is the system of record for users, student/faculty profiles, subjects, class offerings, enrolments, class sessions, attendance, and correction requests. MongoDB is intended for supplementary, flexible audit-event documents in the `audit_logs` collection. The application should use PostgreSQL for authoritative attendance state and MongoDB for event history.

## 2. Entityâ€“relationship model

The model contains nine relational tables:

- `users` has optional one-to-one profile relationships with `students` and `faculty` (the profile tables each have a unique, non-null `user_id`).
- `subjects` and `faculty` each have one-to-many relationships with `class_offerings`.
- `students` and `class_offerings` have a many-to-many relationship resolved by `enrollments`.
- `class_offerings` has many `class_sessions`.
- `class_sessions` and `students` have a many-to-many attendance relationship resolved by `attendance_records`.
- `attendance_records` can have one or more `correction_requests` (the schema does not impose uniqueness on `attendance_id`).

See `ER_DIAGRAM.md` for the Mermaid ER diagram.

## 3. Relational schema and table dictionary

Notation: **PK** = primary key, **FK** = foreign key, **UQ** = unique, **NN** = NOT NULL, **CK** = CHECK, **DF** = default.

### 3.1 `users`
| Attribute | Type | Constraints |
|---|---|---|
| `user_id` | SERIAL | PK |
| `email` | VARCHAR(150) | UQ, NN |
| `password_hash` | TEXT | NN |
| `role` | VARCHAR(20) | NN, CK: `ADMIN`, `FACULTY`, `STUDENT` |
| `is_active` | BOOLEAN | DF `TRUE` |
| `created_at` | TIMESTAMP | DF `CURRENT_TIMESTAMP` |

Stores login identity, password hash, account status and role.

### 3.2 `students`
| Attribute | Type | Constraints |
|---|---|---|
| `student_id` | SERIAL | PK |
| `user_id` | INT | FK -> `users.user_id`, UQ, NN |
| `srn` | VARCHAR(30) | UQ, NN |
| `full_name` | VARCHAR(120) | NN |
| `department` | VARCHAR(100) | NN |
| `semester` | INT | NN, CK: 1â€“8 |
| `section` | VARCHAR(10) | NN |

Stores the student profile. Unique `user_id` enforces at most one student profile per user.

### 3.3 `faculty`
| Attribute | Type | Constraints |
|---|---|---|
| `faculty_id` | SERIAL | PK |
| `user_id` | INT | FK -> `users.user_id`, UQ, NN |
| `employee_id` | VARCHAR(30) | UQ, NN |
| `full_name` | VARCHAR(120) | NN |
| `department` | VARCHAR(100) | NN |

Stores faculty profiles. Unique `user_id` enforces at most one faculty profile per user.

### 3.4 `subjects`
| Attribute | Type | Constraints |
|---|---|---|
| `subject_id` | SERIAL | PK |
| `subject_code` | VARCHAR(20) | UQ, NN |
| `subject_name` | VARCHAR(120) | NN |
| `credits` | INT | NN, CK: greater than 0 |

Stores the catalogue of academic subjects.

### 3.5 `class_offerings`
| Attribute | Type | Constraints |
|---|---|---|
| `offering_id` | SERIAL | PK |
| `subject_id` | INT | FK -> `subjects.subject_id`, NN |
| `faculty_id` | INT | FK -> `faculty.faculty_id`, NN |
| `semester` | INT | NN, CK: 1â€“8 |
| `section` | VARCHAR(10) | NN |
| `academic_year` | VARCHAR(20) | NN |

Represents a subject taught by a faculty member for a semester, section and academic year. Composite UQ: (`subject_id`, `semester`, `section`, `academic_year`).

### 3.6 `enrollments`
| Attribute | Type | Constraints |
|---|---|---|
| `enrollment_id` | SERIAL | PK |
| `student_id` | INT | FK -> `students.student_id`, NN |
| `offering_id` | INT | FK -> `class_offerings.offering_id`, NN |
| `enrolled_at` | TIMESTAMP | DF `CURRENT_TIMESTAMP` |

Associative table between students and class offerings. Composite UQ: (`student_id`, `offering_id`).

### 3.7 `class_sessions`
| Attribute | Type | Constraints |
|---|---|---|
| `session_id` | SERIAL | PK |
| `offering_id` | INT | FK -> `class_offerings.offering_id`, NN |
| `session_date` | DATE | NN |
| `start_time` | TIME | NN |
| `end_time` | TIME | NN, CK: greater than `start_time` |
| `topic` | VARCHAR(200) | Nullable |

Stores individual class meetings. Composite UQ: (`offering_id`, `session_date`, `start_time`).

### 3.8 `attendance_records`
| Attribute | Type | Constraints |
|---|---|---|
| `attendance_id` | SERIAL | PK |
| `session_id` | INT | FK -> `class_sessions.session_id`, NN |
| `student_id` | INT | FK -> `students.student_id`, NN |
| `status` | VARCHAR(20) | NN, CK: `PRESENT`, `ABSENT`, `LATE` |
| `marked_by` | INT | FK -> `faculty.faculty_id`, NN |
| `marked_at` | TIMESTAMP | DF `CURRENT_TIMESTAMP` |

Stores a student's attendance for a class session. Composite UQ: (`session_id`, `student_id`) prevents duplicate attendance for the same student/session.

### 3.9 `correction_requests`
| Attribute | Type | Constraints |
|---|---|---|
| `request_id` | SERIAL | PK |
| `attendance_id` | INT | FK -> `attendance_records.attendance_id`, NN |
| `student_id` | INT | FK -> `students.student_id`, NN |
| `reason` | TEXT | NN |
| `request_status` | VARCHAR(20) | DF `PENDING`; CK: `PENDING`, `APPROVED`, `REJECTED` |
| `reviewed_by` | INT | FK -> `faculty.faculty_id`, nullable |
| `created_at` | TIMESTAMP | DF `CURRENT_TIMESTAMP` |
| `reviewed_at` | TIMESTAMP | nullable |
| `requested_status` | VARCHAR(20) | CK: `PRESENT`, `ABSENT`, `LATE`; nullable; added by `correction_update.sql` |

Stores student requests to correct attendance and the faculty decision. The base `schema.sql` does **not** create `requested_status`; it is introduced by the separate migration.

## 4. Relationship / foreign-key register

| Child table | FK column | Parent table | Cardinality |
|---|---|---|---|
| `students` | `user_id` | `users` | each student profile -> one user; user -> 0/1 student profile |
| `faculty` | `user_id` | `users` | each faculty profile -> one user; user -> 0/1 faculty profile |
| `class_offerings` | `subject_id` | `subjects` | many offerings -> one subject |
| `class_offerings` | `faculty_id` | `faculty` | many offerings -> one faculty member |
| `enrollments` | `student_id` | `students` | many enrolments -> one student |
| `enrollments` | `offering_id` | `class_offerings` | many enrolments -> one offering |
| `class_sessions` | `offering_id` | `class_offerings` | many sessions -> one offering |
| `attendance_records` | `session_id` | `class_sessions` | many attendance rows -> one session |
| `attendance_records` | `student_id` | `students` | many attendance rows -> one student |
| `attendance_records` | `marked_by` | `faculty` | many attendance rows -> one marking faculty member |
| `correction_requests` | `attendance_id` | `attendance_records` | many requests -> one attendance row |
| `correction_requests` | `student_id` | `students` | many requests -> one student |
| `correction_requests` | `reviewed_by` | `faculty` | many reviewed requests -> one faculty member |

No explicit `ON DELETE` or `ON UPDATE` action is specified in these foreign keys; PostgreSQL therefore applies its default `NO ACTION` behaviour.

See `RELATIONAL_SCHEMA.md` for a compact schema diagram.

## 5. Constraints and integrity rules

### Entity integrity
- Every table has a surrogate `SERIAL` primary key.
- Primary keys uniquely identify rows and cannot be null.

### Referential integrity
- Foreign keys ensure that profiles, offerings, enrolments, sessions, attendance and correction requests refer to existing parent records.
- No cascading delete behaviour is declared.

### Domain integrity
- User role is restricted to `ADMIN`, `FACULTY`, or `STUDENT`.
- Student and offering semester values must be between 1 and 8.
- Subject credits must be positive.
- Session end time must be later than start time.
- Attendance status is restricted to `PRESENT`, `ABSENT`, or `LATE`.
- Correction request status is restricted to `PENDING`, `APPROVED`, or `REJECTED`.
- `requested_status`, when present, is restricted to `PRESENT`, `ABSENT`, or `LATE`.

### Uniqueness
- User email, student SRN, faculty employee ID and subject code are unique.
- Student and faculty `user_id` values are unique.
- Offering identity is unique by subject, semester, section and academic year.
- Enrolment identity is unique by student and offering.
- Session identity is unique by offering, date and start time.
- Attendance identity is unique by session and student.

## 6. Indexes

`schema.sql` explicitly creates these indexes:

| Index | Columns | Purpose |
|---|---|---|
| `idx_students_srn` | `students(srn)` | SRN lookup |
| `idx_enrollments_student` | `enrollments(student_id)` | Find offerings for a student |
| `idx_enrollments_offering` | `enrollments(offering_id)` | Find students in an offering |
| `idx_sessions_offering_date` | `class_sessions(offering_id, session_date)` | Find dated sessions for an offering |
| `idx_attendance_student` | `attendance_records(student_id)` | Find a student's attendance |
| `idx_attendance_session` | `attendance_records(session_id)` | Find attendance for a session |
| `idx_correction_status` | `correction_requests(request_status)` | Filter correction requests by status |

PostgreSQL automatically creates indexes to enforce primary-key and unique constraints. Consequently, `idx_students_srn` duplicates the index already supporting `UNIQUE(srn)` and is a candidate for removal only after confirming no project requirement explicitly asks for it. Do not remove it during a documentation-only change.

## 7. SQL features implemented

### DDL
- `CREATE TABLE` statements create the nine relational tables.
- `CREATE INDEX` statements create seven explicit indexes.
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `correction_update.sql` adds `requested_status`.
- `CREATE OR REPLACE FUNCTION`, `CREATE TRIGGER`, and `CREATE OR REPLACE PROCEDURE` create programmable database objects.
- No `DROP TABLE` or `DROP DATABASE` statement appears in the reviewed SQL scripts.

### DML
- `INSERT` populates users, faculty, students, subjects, offerings, enrolments, sessions and attendance in `seed.sql`.
- `SELECT` is used in the transaction script to inspect a correction request and in the function/procedure to validate related rows.
- `UPDATE` changes attendance status and correction review metadata in the stored procedure.
- No standalone `DELETE` example appears in the reviewed SQL scripts.

### Trigger and function: attendance validation
`validate_attendance()` is a PL/pgSQL trigger function invoked by `attendance_validation_trigger` before `INSERT` or `UPDATE` on `attendance_records`.

It verifies:
1. The referenced class session exists.
2. The student is enrolled in the class offering associated with that session.
3. The faculty member marking attendance is assigned to that offering.

It raises an exception when any rule fails, preventing the invalid attendance write.

### Stored procedure: correction review
`review_correction_request(p_request_id, p_faculty_id, p_decision)`:
1. Accepts only `APPROVED` or `REJECTED`.
2. Finds a pending request and locks it using `FOR UPDATE`.
3. Confirms the supplied faculty member teaches the class associated with the attendance record.
4. On approval, requires `requested_status` and updates the attendance row.
5. Updates the request status, reviewer and review timestamp.

A rejected request updates the request review fields but does not change attendance status.

### Views
No `CREATE VIEW` or `CREATE MATERIALIZED VIEW` statement was found in the reviewed database SQL files. Do not claim that views are implemented. If views are required by the assignment rubric, add them as a separate, reviewed enhancement.

### Transactions
`transactions.sql` demonstrates explicit transaction control with `BEGIN`, `INSERT`, `SELECT` and `COMMIT` for a correction request. The stored procedure also uses `SELECT ... FOR UPDATE` to lock the pending request during review; PostgreSQL executes a procedure call within the caller's transaction context.

The transaction example currently hard-codes `attendance_id = 2` and `student_id = 2`; verify these IDs exist and correspond to one another in the target database before running it. It is not a safe, repeatable seed script as written.

## 8. MongoDB audit datastore

The repository's `mongodb-seed.js` creates sample documents in the `audit_logs` collection. The documents demonstrate event types:
- `ATTENDANCE_MARKED`
- `CORRECTION_APPROVED`

The sample documents include student/session or attendance identifiers, status, actor/reviewer, timestamp and a flexible `details` object. The script creates indexes on `student_id`, `event_type`, and descending `timestamp`, then groups audit records by event type using an aggregation pipeline.

This is a seed/demo script, not proof of application-level audit logging. The inspected MongoDB connection helper establishes a client connection, but the inspected application routes do not demonstrate writes to `audit_logs`. Until a route or service writes audit events during real actions, describe MongoDB integration as **seeded/demo audit storage**, not fully integrated runtime auditing.

## 9. Recommended SQL execution order

Run from the repository root against a clean PostgreSQL database:

1. `database/schema.sql`
2. `database/correction_update.sql`
3. `database/advanced.sql`
4. `database/seed.sql`

Then verify objects and sample rows before running `database/transactions.sql`.

**Why this order matters:** `review_correction_request()` references `correction_requests.requested_status`. That column is not created by `schema.sql`; it is added by `correction_update.sql`. Therefore, running `advanced.sql` before the migration can fail while creating the procedure.

The seed script uses explicit IDs such as `user_id = 2`, `faculty_id = 1`, and `student_id = 1/2` in dependent inserts. It assumes a clean database with sequences starting at their initial values. Do not rerun it on a populated database without resetting or adapting the seed data.

Also, the seed inserts literal strings such as `temp_hash_admin` into `password_hash`. These are placeholders, not verified application password hashes. Configure valid demo credentials through the application's supported authentication setup before a login demonstration.

## 10. Database verification checklist

Mark each test as PASS only after running it against the actual database and saving evidence.

| ID | Verification | Expected result | Status |
|---|---|---|---|
| DB-01 | Query `information_schema.tables` | All 9 expected tables exist | Pending execution |
| DB-02 | Inspect primary/foreign/unique/check constraints | Constraints match this document | Pending execution |
| DB-03 | Inspect `pg_indexes` | Expected explicit indexes exist | Pending execution |
| DB-04 | Insert attendance for an enrolled student, assigned faculty and valid session | Insert succeeds | Pending execution |
| DB-05 | Insert attendance for a non-enrolled student | Trigger raises exception | Pending execution |
| DB-06 | Mark attendance using unassigned faculty | Trigger raises exception | Pending execution |
| DB-07 | Insert duplicate attendance for same session/student | Unique constraint rejects it | Pending execution |
| DB-08 | Create pending correction request with requested status | Request is stored as pending | Pending execution |
| DB-09 | Approve with assigned faculty | Attendance status and review metadata update | Pending execution |
| DB-10 | Review with unassigned faculty | Procedure raises exception; no review update | Pending execution |
| DB-11 | Review an already-reviewed request | Procedure rejects repeat review | Pending execution |
| DB-12 | Reject a correction request | Request becomes rejected; attendance remains unchanged | Pending execution |
| DB-13 | Execute transaction script after checking IDs | Insert visible before commit and persisted after commit | Pending execution |
| DB-14 | Run MongoDB seed and inspect `audit_logs` | Sample docs, indexes and aggregation work | Pending execution |
| DB-15 | Confirm application action writes a MongoDB audit document | A new audit document appears after the action | Pending execution / not demonstrated in inspected code |

## 11. Important limitations and follow-up fixes

1. **Migration dependency:** document and enforce the order `schema.sql` -> `correction_update.sql` -> `advanced.sql`.
2. **Correction ownership:** the schema has separate `attendance_id` and `student_id` foreign keys but no composite constraint proving that the attendance row belongs to the same student. The application route should validate ownership; a database-level constraint/trigger could strengthen this.
3. **One pending request policy:** the current schema permits multiple correction requests for the same attendance record, including multiple pending requests. Confirm whether the assignment expects one pending request at a time.
4. **Index redundancy:** `idx_students_srn` duplicates the unique index created for `srn`.
5. **No views:** none found in the reviewed SQL files. Add only if required by the assignment.
6. **MongoDB runtime writes:** the sample seed is not an audit integration. Implement and test actual event writes if audit logging is required.
7. **Transaction script repeatability:** hard-coded IDs may not match a non-empty database.
8. **Demo credentials:** placeholder password hashes must not be represented as working credentials.

## 12. Evidence to capture for the final report

Capture genuine screenshots from pgAdmin/psql and the running application:
- ER diagram and relational schema diagram.
- All nine tables and their columns.
- PK, FK, UNIQUE and CHECK constraints.
- Trigger and procedure definitions.
- Index list.
- Successful valid attendance insert.
- Rejected invalid attendance insert (trigger error).
- Correction request approval and rejection.
- MongoDB `audit_logs` documents, indexes and aggregation output.
- Transaction execution and committed result.

Do not insert expected output screenshots in place of actual execution evidence.





