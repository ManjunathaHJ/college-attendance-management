-- Attendance report: students with absent records, grouped by subject.

SELECT
    s.srn,
    s.full_name AS student_name,
    sub.subject_code,
    sub.subject_name,
    COUNT(ar.attendance_id) AS total_recorded_classes,
    SUM(CASE WHEN ar.status = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
    SUM(CASE WHEN ar.status = 'LATE' THEN 1 ELSE 0 END) AS late_count,
    SUM(CASE WHEN ar.status = 'ABSENT' THEN 1 ELSE 0 END) AS absent_count,
    ROUND(
        100.0 * SUM(CASE WHEN ar.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END)
        / NULLIF(COUNT(ar.attendance_id), 0),
        2
    ) AS attendance_percentage
FROM attendance_records ar
JOIN students s
    ON ar.student_id = s.student_id
JOIN class_sessions cs
    ON ar.session_id = cs.session_id
JOIN class_offerings co
    ON cs.offering_id = co.offering_id
JOIN subjects sub
    ON co.subject_id = sub.subject_id
GROUP BY
    s.student_id,
    s.srn,
    s.full_name,
    sub.subject_code,
    sub.subject_name
HAVING SUM(
    CASE WHEN ar.status = 'ABSENT' THEN 1 ELSE 0 END
) > 0
ORDER BY
    sub.subject_code,
    attendance_percentage ASC;
