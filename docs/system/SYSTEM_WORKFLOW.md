# System Workflow — College Attendance Management System

## 1. Role-based functional workflow

```mermaid
flowchart TD
    START([Open application]) --> LOGIN["Login page"]
    LOGIN --> AUTH["POST /api/auth/login"]
    AUTH --> VALID{"Credentials valid<br/>and account active?"}
    VALID -- No --> ERROR["Show login error"]
    ERROR --> LOGIN
    VALID -- Yes --> ROLE{"Account role"}
    ROLE -- ADMIN --> ADMIN["Admin dashboard"]
    ROLE -- FACULTY --> FACULTY["Faculty dashboard"]
    ROLE -- STUDENT --> STUDENT["Student dashboard"]

    ADMIN --> AM["Manage student and faculty profiles"]
    ADMIN --> AV["View attendance and correction requests"]

    FACULTY --> FO["View assigned class offerings"]
    FO --> SESSION["Create class session"]
    SESSION --> MARK["Select enrolled students<br/>and mark attendance"]
    MARK --> SAVE["POST /api/attendance"]
    SAVE --> PG1[("PostgreSQL<br/>attendance_records")]
    PG1 --> TRIGGER["Attendance validation trigger"]

    STUDENT --> MYATT["View personal attendance"]
    MYATT --> REQUEST["Submit correction request"]
    REQUEST --> OWNER["API checks attendance belongs<br/>to authenticated student"]
    OWNER --> PG2[("PostgreSQL<br/>correction_requests")]
    PG2 --> REVIEW["Faculty reviews request"]
    REVIEW --> DECISION{"Approve or reject?"}
    DECISION -- Approve --> PROC["Stored procedure updates<br/>attendance and review metadata"]
    DECISION -- Reject --> REJECT["Stored procedure records<br/>rejection metadata"]
    PROC --> PG1
    REJECT --> PG2
```

## 2. Attendance recording sequence

```mermaid
sequenceDiagram
    actor Faculty
    participant UI as Next.js UI
    participant API as Attendance Route Handler
    participant Auth as JWT authorization
    participant PG as PostgreSQL

    Faculty->>UI: Select assigned class and create session
    UI->>API: POST /api/sessions
    API->>Auth: Read and verify attendance_session
    Auth-->>API: Authenticated Faculty identity
    API->>PG: Verify faculty owns class offering
    API->>PG: INSERT class_sessions
    PG-->>API: session_id
    API-->>UI: Session created

    Faculty->>UI: Select session and mark student statuses
    UI->>API: POST /api/attendance
    API->>Auth: Verify Faculty role
    API->>PG: BEGIN
    API->>PG: Verify session assignment
    loop Each submitted student
        API->>PG: INSERT attendance_records
        PG->>PG: BEFORE INSERT validation trigger
        PG->>PG: Check session, enrolment, assigned faculty
    end
    API->>PG: COMMIT
    API-->>UI: Success or validation error
```

## 3. Attendance correction sequence

```mermaid
sequenceDiagram
    actor Student
    actor Faculty
    participant UI as Next.js UI
    participant API as Corrections Route Handler
    participant PG as PostgreSQL

    Student->>UI: Select own attendance and enter reason/status
    UI->>API: POST /api/corrections
    API->>PG: Resolve student profile from authenticated user
    API->>PG: Insert only matching attendance_id + student_id
    PG-->>API: New pending request
    API-->>UI: Request submitted

    Faculty->>UI: Open correction requests
    UI->>API: GET /api/corrections
    API->>PG: Return requests for assigned offerings
    PG-->>API: Request list
    API-->>UI: Display pending requests

    Faculty->>UI: Approve or reject
    UI->>API: PATCH /api/corrections
    API->>PG: CALL review_correction_request(...)
    PG->>PG: Lock pending request and verify faculty assignment
    alt Approved
        PG->>PG: Update attendance status
        PG->>PG: Update request status/reviewer/reviewed_at
    else Rejected
        PG->>PG: Update request status/reviewer/reviewed_at
        Note over PG: Attendance status remains unchanged
    end
    API-->>UI: Review result
```

## 4. Role capability summary

| Capability | Admin | Faculty | Student |
|---|---:|---:|---:|
| View student records | Yes | No | No |
| Create student accounts/profiles | Yes | No | No |
| View faculty records | Yes | No | No |
| Create faculty accounts/profiles | Yes | No | No |
| View all attendance | Yes | No | No |
| View assigned class attendance | No | Yes | No |
| View own attendance | No | No | Yes |
| Create class sessions | No | Assigned offerings only | No |
| Mark attendance | No | Assigned classes only | No |
| Submit correction request | No | No | Own attendance only |
| View correction requests | All | Assigned classes | Own requests |
| Approve/reject correction requests | No | Assigned classes | No |

This matrix describes the intended and source-implemented API/UI role behaviour inspected in the repository. The dashboard API authentication gap documented in `SYSTEM_ARCHITECTURE.md` must be treated separately; do not infer security from client-side page redirects.

## 5. Workflow rules

- An account must be active and its password hash must verify before a session is issued.
- The session JWT expires after eight hours.
- Students retrieve only attendance rows associated with their student profile.
- Faculty can create sessions only for offerings assigned to them.
- Faculty can mark attendance only for sessions belonging to their assigned offerings.
- Attendance status values are `PRESENT`, `ABSENT`, and `LATE`.
- A student can submit a correction only for an attendance row belonging to that student.
- Faculty correction review is restricted to assigned offerings and is delegated to the PostgreSQL stored procedure.
- Approval changes attendance status; rejection does not.

## 6. Verification boundary

These diagrams document the code paths and database logic found during repository inspection. They are not evidence that the application has been launched or that each workflow has passed a live test. Record actual outcomes in the final testing report after execution.
