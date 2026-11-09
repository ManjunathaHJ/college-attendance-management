
ALTER TABLE correction_requests
ADD COLUMN IF NOT EXISTS requested_status VARCHAR(20)
CHECK (requested_status IN ('PRESENT', 'ABSENT', 'LATE'));
