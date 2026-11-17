-- Demonstrate DELETE safely using a temporary table.
-- No permanent application data is modified.

BEGIN;

CREATE TEMPORARY TABLE delete_demo (
    demo_id INT PRIMARY KEY,
    description VARCHAR(100)
);

INSERT INTO delete_demo (demo_id, description)
VALUES
    (1, 'First demonstration record'),
    (2, 'Record to be deleted'),
    (3, 'Third demonstration record');

-- Display records before deletion
SELECT * FROM delete_demo ORDER BY demo_id;

-- Delete a selected record
DELETE FROM delete_demo
WHERE demo_id = 2;

-- Verify the deletion
SELECT * FROM delete_demo ORDER BY demo_id;

-- Roll back the demonstration
ROLLBACK;
