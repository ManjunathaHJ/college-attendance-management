-- Attendance summary view
-- Calculates student attendance statistics for each subject.

CREATE OR REPLACE VIEW attendance_summary AS
SELECT
    s.student_id,
    s.srn,
    s.full_name AS student_name,
    sub.subject_code,
    sub.subject_name,
    COUNT(DISTINCT cs.session_id) AS total_classes,
    COUNT(ar.attendance_id) FILTER (
        WHERE ar.status = 'PRESENT'
    ) AS present_classes,
    COUNT(ar.attendance_id) FILTER (
        WHERE ar.status = 'LATE'
    ) AS late_classes,
    COUNT(ar.attendance_id) FILTER (
        WHERE ar.status = 'ABSENT'
    ) AS absent_classes,
    ROUND(
        100.0 * COUNT(ar.attendance_id) FILTER (
            WHERE ar.status IN ('PRESENT', 'LATE')
        )::numeric
        / NULLIF(COUNT(DISTINCT cs.session_id), 0)::numeric,
        2
    ) AS attendance_percentage
FROM students s
JOIN enrollments e
    ON s.student_id = e.student_id
JOIN class_offerings co
    ON e.offering_id = co.offering_id
JOIN subjects sub
    ON co.subject_id = sub.subject_id
LEFT JOIN class_sessions cs
    ON co.offering_id = cs.offering_id
LEFT JOIN attendance_records ar
    ON cs.session_id = ar.session_id
    AND s.student_id = ar.student_id
GROUP BY
    s.student_id,
    s.srn,
    s.full_name,
    sub.subject_code,
    sub.subject_name;
