
-- =========================================
-- COLLEGE ATTENDANCE MANAGEMENT SYSTEM
-- PostgreSQL Database Schema
-- =========================================

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('ADMIN', 'FACULTY', 'STUDENT')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(user_id),
    srn VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    department VARCHAR(100) NOT NULL,
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    section VARCHAR(10) NOT NULL
);

CREATE TABLE faculty (
    faculty_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(user_id),
    employee_id VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    department VARCHAR(100) NOT NULL
);

CREATE TABLE subjects (
    subject_id SERIAL PRIMARY KEY,
    subject_code VARCHAR(20) UNIQUE NOT NULL,
    subject_name VARCHAR(120) NOT NULL,
    credits INT NOT NULL CHECK (credits > 0)
);

CREATE TABLE class_offerings (
    offering_id SERIAL PRIMARY KEY,
    subject_id INT NOT NULL REFERENCES subjects(subject_id),
    faculty_id INT NOT NULL REFERENCES faculty(faculty_id),
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    section VARCHAR(10) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    UNIQUE (subject_id, semester, section, academic_year)
);

CREATE TABLE enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(student_id),
    offering_id INT NOT NULL REFERENCES class_offerings(offering_id),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, offering_id)
);

CREATE TABLE class_sessions (
    session_id SERIAL PRIMARY KEY,
    offering_id INT NOT NULL REFERENCES class_offerings(offering_id),
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic VARCHAR(200),
    CHECK (end_time > start_time),
    UNIQUE (offering_id, session_date, start_time)
);

CREATE TABLE attendance_records (
    attendance_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES class_sessions(session_id),
    student_id INT NOT NULL REFERENCES students(student_id),
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('PRESENT', 'ABSENT', 'LATE')),
    marked_by INT NOT NULL REFERENCES faculty(faculty_id),
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (session_id, student_id)
);

CREATE TABLE correction_requests (
    request_id SERIAL PRIMARY KEY,
    attendance_id INT NOT NULL REFERENCES attendance_records(attendance_id),
    student_id INT NOT NULL REFERENCES students(student_id),
    reason TEXT NOT NULL,
    request_status VARCHAR(20) DEFAULT 'PENDING'
        CHECK (request_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by INT REFERENCES faculty(faculty_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP
);

-- =========================================
-- INDEXES
-- =========================================

CREATE INDEX idx_students_srn
ON students(srn);

CREATE INDEX idx_enrollments_student
ON enrollments(student_id);

CREATE INDEX idx_enrollments_offering
ON enrollments(offering_id);

CREATE INDEX idx_sessions_offering_date
ON class_sessions(offering_id, session_date);

CREATE INDEX idx_attendance_student
ON attendance_records(student_id);

CREATE INDEX idx_attendance_session
ON attendance_records(session_id);

CREATE INDEX idx_correction_status
ON correction_requests(request_status);
