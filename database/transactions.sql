-- Create a correction request inside a transaction
BEGIN;

INSERT INTO correction_requests
    (attendance_id, student_id, reason)
VALUES
    (2, 2, 'Requesting a review of the attendance marked absent.');

-- Verify the inserted request before committing
SELECT *
FROM correction_requests
WHERE attendance_id = 2;

COMMIT;