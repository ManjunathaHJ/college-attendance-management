// College Attendance Management System - MongoDB

// Create sample audit log records
db.audit_logs.insertMany([
    {
        event_type: "ATTENDANCE_MARKED",
        student_id: 1,
        session_id: 1,
        status: "PRESENT",
        marked_by: 1,
        timestamp: new Date(),
        details: {
            source: "Faculty Dashboard"
        }
    },
    {
        event_type: "ATTENDANCE_MARKED",
        student_id: 2,
        session_id: 1,
        status: "ABSENT",
        marked_by: 1,
        timestamp: new Date(),
        details: {
            source: "Faculty Dashboard"
        }
    },
    {
        event_type: "CORRECTION_APPROVED",
        student_id: 2,
        attendance_id: 2,
        reviewed_by: 1,
        timestamp: new Date(),
        details: {
            decision: "APPROVED"
        }
    }
]);

// Create indexes for faster searches
db.audit_logs.createIndex({ student_id: 1 });
db.audit_logs.createIndex({ event_type: 1 });
db.audit_logs.createIndex({ timestamp: -1 });
// Aggregate audit logs by event type
db.audit_logs.aggregate([
    {
        $group: {
            _id: "$event_type",
            total_events: { $sum: 1 }
        }
    },
    {
        $sort: {
            total_events: -1
        }
    }
]);