-- 1. Create users
INSERT INTO users (email, password_hash, role) VALUES
('admin@college.edu', 'temp_hash_admin', 'ADMIN'),
('faculty@college.edu', 'temp_hash_faculty', 'FACULTY'),
('student1@college.edu', 'temp_hash_student1', 'STUDENT'),
('student2@college.edu', 'temp_hash_student2', 'STUDENT');

-- 2. Create faculty
INSERT INTO faculty (user_id, employee_id, full_name, department)
VALUES (2, 'FAC001', 'Faculty One', 'AIML');

-- 3. Create students
INSERT INTO students (user_id, srn, full_name, department, semester, section) VALUES
(3, 'PES1UG24AM157', 'Student One', 'AIML', 5, 'A'),
(4, 'PES1UG24AM158', 'Student Two', 'AIML', 5, 'A');

-- 4. Create subjects
INSERT INTO subjects (subject_code, subject_name, credits) VALUES
('DBMS', 'Database Management Systems', 4);

-- 5. Create a class offering
INSERT INTO class_offerings
(subject_id, faculty_id, semester, section, academic_year)
VALUES (1, 1, 5, 'A', '2026-2027');

-- 6. Enroll students
INSERT INTO enrollments (student_id, offering_id) VALUES
(1, 1),
(2, 1);

-- 7. Create a class session
INSERT INTO class_sessions
(offering_id, session_date, start_time, end_time, topic)
VALUES (1, CURRENT_DATE, '09:00', '10:00', 'Introduction to DBMS');

-- 8. Record attendance
INSERT INTO attendance_records
(session_id, student_id, status, marked_by)
VALUES
(1, 1, 'PRESENT', 1),
(1, 2, 'ABSENT', 1);