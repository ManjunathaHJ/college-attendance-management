-- Function to validate attendance records
CREATE OR REPLACE FUNCTION validate_attendance()
RETURNS TRIGGER AS $$
DECLARE
    current_offering_id INT;
BEGIN
    -- Find which class offering this session belongs to
    SELECT offering_id
    INTO current_offering_id
    FROM class_sessions
    WHERE session_id = NEW.session_id;

    IF current_offering_id IS NULL THEN
        RAISE EXCEPTION 'Invalid class session';
    END IF;

    -- Check whether the student is enrolled
    IF NOT EXISTS (
        SELECT 1
        FROM enrollments
        WHERE student_id = NEW.student_id
          AND offering_id = current_offering_id
    ) THEN
        RAISE EXCEPTION 'Student is not enrolled in this class';
    END IF;

    -- Check whether the faculty member teaches this class
    IF NOT EXISTS (
        SELECT 1
        FROM class_offerings
        WHERE offering_id = current_offering_id
          AND faculty_id = NEW.marked_by
    ) THEN
        RAISE EXCEPTION 'Faculty member is not assigned to this class';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the attendance validation trigger
DROP TRIGGER IF EXISTS attendance_validation_trigger
ON attendance_records;

CREATE TRIGGER attendance_validation_trigger
BEFORE INSERT OR UPDATE ON attendance_records
FOR EACH ROW
EXECUTE FUNCTION validate_attendance();

-- Stored procedure to review attendance correction requests

CREATE OR REPLACE PROCEDURE review_correction_request(
    p_request_id INT,
    p_faculty_id INT,
    p_decision VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_attendance_id INT;
    v_requested_status VARCHAR(20);
BEGIN
    IF p_decision NOT IN ('APPROVED', 'REJECTED') THEN
        RAISE EXCEPTION 'Invalid decision';
    END IF;

    SELECT cr.attendance_id, cr.requested_status
    INTO v_attendance_id, v_requested_status
    FROM correction_requests cr
    WHERE cr.request_id = p_request_id
      AND cr.request_status = 'PENDING'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or already reviewed';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM attendance_records ar
        JOIN class_sessions cs ON ar.session_id = cs.session_id
        JOIN class_offerings co ON cs.offering_id = co.offering_id
        WHERE ar.attendance_id = v_attendance_id
          AND co.faculty_id = p_faculty_id
    ) THEN
        RAISE EXCEPTION 'Faculty is not assigned to this class';
    END IF;

    IF p_decision = 'APPROVED' THEN
        IF v_requested_status IS NULL THEN
            RAISE EXCEPTION 'Requested attendance status is missing';
        END IF;

        UPDATE attendance_records
        SET status = v_requested_status
        WHERE attendance_id = v_attendance_id;
    END IF;

    UPDATE correction_requests
    SET request_status = p_decision,
        reviewed_by = p_faculty_id,
        reviewed_at = CURRENT_TIMESTAMP
    WHERE request_id = p_request_id;
END;
$$;
