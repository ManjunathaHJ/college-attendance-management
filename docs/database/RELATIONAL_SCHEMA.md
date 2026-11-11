# Relational schema diagram — College Attendance Management System

```mermaid
flowchart LR
  U["USERS<br/>PK user_id<br/>UQ email"]
  ST["STUDENTS<br/>PK student_id<br/>FK/UQ user_id<br/>UQ srn"]
  F["FACULTY<br/>PK faculty_id<br/>FK/UQ user_id<br/>UQ employee_id"]
  SU["SUBJECTS<br/>PK subject_id<br/>UQ subject_code"]
  CO["CLASS_OFFERINGS<br/>PK offering_id<br/>FK subject_id<br/>FK faculty_id<br/>UQ subject+semester+section+year"]
  E["ENROLLMENTS<br/>PK enrollment_id<br/>FK student_id<br/>FK offering_id<br/>UQ student+offering"]
  CS["CLASS_SESSIONS<br/>PK session_id<br/>FK offering_id<br/>UQ offering+date+start"]
  AR["ATTENDANCE_RECORDS<br/>PK attendance_id<br/>FK session_id<br/>FK student_id<br/>FK marked_by<br/>UQ session+student"]
  CR["CORRECTION_REQUESTS<br/>PK request_id<br/>FK attendance_id<br/>FK student_id<br/>FK reviewed_by"]

  U --> ST
  U --> F
  SU --> CO
  F --> CO
  ST --> E
  CO --> E
  CO --> CS
  CS --> AR
  ST --> AR
  F --> AR
  AR --> CR
  ST --> CR
  F --> CR
```

**Legend:** PK = Primary Key; FK = Foreign Key; UQ = Unique constraint. Composite unique constraints are written out in the relevant table box.
